import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RawPost, Classification } from '../common/interfaces';
import { Keyword, KeywordDocument } from '../keywords/schemas/keyword.schema';

const SERVICE_LINES: Record<number, string> = {
  1: 'AI / LLM integration',
  2: 'Chrome extension',
  3: 'Fix / finish vibe-coded app',
  4: 'Full-stack MVP build / finish',
  5: 'React / Next / Node bug fix & deploy',
};

@Injectable()
export class ClassifyService {
  private readonly logger = new Logger(ClassifyService.name);
  private genai: GoogleGenerativeAI;
  private geminiCallsToday = 0;
  private geminiCallDate = this.currentDateKey();

  constructor(
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genai = new GoogleGenerativeAI(apiKey);
    }
  }

  async keywordFilter(post: RawPost): Promise<{
    pass: boolean;
    matchedServiceLines: number[];
    matchedIntentTerms: string[];
  }> {
    const text = `${post.title} ${post.body}`.toLowerCase();

    const keywords = await this.keywordModel.find({ enabled: true }).lean();

    const blacklist = keywords.filter((k) => k.type === 'blacklist');
    for (const bl of blacklist) {
      if (text.includes(bl.term.toLowerCase())) {
        return { pass: false, matchedServiceLines: [], matchedIntentTerms: [] };
      }
    }

    const coreKeywords = keywords.filter((k) => k.type === 'core');
    const matchedServiceLines = new Set<number>();
    for (const kw of coreKeywords) {
      if (text.includes(kw.term.toLowerCase())) {
        matchedServiceLines.add(kw.serviceLine);
      }
    }

    const matchedIntentTerms = keywords
      .filter((k) => k.type === 'intent')
      .filter((kw) => text.includes(kw.term.toLowerCase()))
      .map((kw) => kw.term);

    return {
      pass: matchedServiceLines.size > 0 || matchedIntentTerms.length > 0,
      matchedServiceLines: [...matchedServiceLines],
      matchedIntentTerms,
    };
  }

  async llmClassify(post: RawPost): Promise<Classification | null> {
    if (!this.genai) {
      this.logger.warn('Gemini API key not configured');
      return null;
    }

    if (!this.canCallGemini()) {
      return null;
    }

    const model = this.genai.getGenerativeModel({
      model: this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash'),
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `You are a lead classifier for a freelance developer. Analyze this post and determine if it's a real, payable lead.

The developer's service lines:
1. AI / LLM integration (top priority) — adding AI features, chatbots, OpenAI/Claude/Gemini APIs, RAG
2. Chrome extension development — browser extensions, manifest v3
3. Fix / finish vibe-coded app — apps built with Lovable, Bolt.new, v0, Cursor, Replit that need fixing
4. Full-stack MVP build / finish — building MVPs, web apps, SaaS
5. React / Next / Node bug fix & deploy — bug fixes, deployment issues

The ideal lead is a NON-TECHNICAL or semi-technical founder/solo operator who:
- Has a product or idea in motion (live site, MVP, launch)
- Is stuck on something or explicitly looking to hire/pay
- Communicates in plain language, not deep technical jargon

Strong positive signals: mentions paying/budget/hiring/rate/deadline, links a live product, describes a business
Negative signals: "free only", "equity only", "unpaid", job seekers, recruiters, students with homework

GITHUB-SPECIFIC RULES (apply when Source is "github"):
A detailed spec or PRD-style issue is NOT a lead. Most are owners speccing their own project for themselves or their own AI agent — NO hiring intent.
A GitHub issue is ONLY relevant (is_relevant: true) if it has at least ONE of:
- A bounty label or dollar/USDC amount attached
- Explicit hiring language: "looking for a developer", "open to contributors", "will pay", "hiring", "freelancer wanted", "budget", "bounty"
- The author is clearly inviting an OUTSIDE person to build it (not assigning to themselves)
ALWAYS DROP (is_relevant: false) if it is:
- A PRD/roadmap issue the author assigned to themselves or their own AI agent
- Written as the author's own to-do ("As a developer I want...") with no payment or contributor invitation
- A spec the author is building to feed their own AI agent/Claude Code
- Web3/blockchain/Solidity/Python/Rust as the core work (outside the developer's TypeScript/React/Next/Node stack)
When in doubt on a GitHub issue with no money signal and no contributor invitation, DROP it.

POST TO ANALYZE:
Source: ${post.source}
Title: ${post.title}
Body: ${post.body}
Author: ${post.author}
Subreddit: ${post.subreddit || 'N/A'}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "is_relevant": boolean,
  "service_line": integer (1=AI/LLM, 2=Chrome ext, 3=Vibe-coded fix, 4=MVP build, 5=React/Node fix, 0=none of the above),
  "is_nontechnical_founder": boolean,
  "intent_to_pay": "explicit" | "implied" | "none",
  "budget_signal": boolean,
  "urgency": "high" | "medium" | "low",
  "one_line_summary": "string (max 100 chars)",
  "suggested_proof": "QuickGo" | "EcoLife" | "TruthLens" | "relevant past project",
  "confidence": number (0.0 to 1.0)
}
IMPORTANT: service_line MUST be an integer 0-5. Use 0 only when the post does not match any service line.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        this.recordGeminiCall();
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        return this.parseClassificationResponse(text);
      } catch (err: any) {
        const message = `LLM classification attempt ${attempt} failed for ${post.source}:${post.externalId}: ${err.message}`;
        if (attempt === 2) {
          this.logger.error(message);
          return null;
        }
        this.logger.warn(`${message}; retrying once`);
      }
    }

    return null;
  }

  private parseClassificationResponse(text: string): Classification | null {
    const stripped = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const jsonStart = stripped.indexOf('{');
    const jsonEnd = stripped.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('Gemini response did not contain a JSON object');
    }

    const parsed = JSON.parse(stripped.slice(jsonStart, jsonEnd + 1));
    this.normalizeClassification(parsed);
    this.assertValidClassification(parsed);
    return parsed;
  }

  private normalizeClassification(value: any): void {
    if (value.service_line !== undefined) {
      const sl = Number(value.service_line);
      value.service_line = Number.isFinite(sl) ? sl : 0;
    }
    if (value.confidence !== undefined) {
      value.confidence = Number(value.confidence);
    }
  }

  private assertValidClassification(value: any): asserts value is Classification {
    const validIntent = ['explicit', 'implied', 'none'];
    const validUrgency = ['high', 'medium', 'low'];

    if (typeof value?.is_relevant !== 'boolean') {
      this.logger.error(`Gemini validation fail: raw JSON: ${JSON.stringify(value)}`);
      throw new Error('Gemini JSON missing boolean is_relevant');
    }
    if (![0, 1, 2, 3, 4, 5].includes(value.service_line)) {
      this.logger.error(`Gemini validation fail: service_line=${JSON.stringify(value.service_line)}, raw JSON: ${JSON.stringify(value)}`);
      throw new Error(`Gemini JSON has invalid service_line: ${value.service_line}`);
    }
    if (typeof value.is_nontechnical_founder !== 'boolean') {
      throw new Error('Gemini JSON missing boolean is_nontechnical_founder');
    }
    if (!validIntent.includes(value.intent_to_pay)) {
      throw new Error('Gemini JSON has invalid intent_to_pay');
    }
    if (typeof value.budget_signal !== 'boolean') {
      throw new Error('Gemini JSON missing boolean budget_signal');
    }
    if (!validUrgency.includes(value.urgency)) {
      throw new Error('Gemini JSON has invalid urgency');
    }
    if (typeof value.one_line_summary !== 'string') {
      throw new Error('Gemini JSON missing one_line_summary');
    }
    if (typeof value.suggested_proof !== 'string') {
      throw new Error('Gemini JSON missing suggested_proof');
    }
    if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
      throw new Error('Gemini JSON has invalid confidence');
    }
  }

  private canCallGemini(): boolean {
    this.resetGeminiCounterIfNeeded();
    const limit = parseInt(this.config.get<string>('GEMINI_DAILY_LIMIT', '500'), 10);

    if (limit <= 0) {
      this.logger.warn('Gemini classification disabled by GEMINI_DAILY_LIMIT');
      return false;
    }

    if (this.geminiCallsToday >= limit) {
      this.logger.warn(`Gemini daily limit reached (${this.geminiCallsToday}/${limit})`);
      return false;
    }

    return true;
  }

  private recordGeminiCall() {
    this.resetGeminiCounterIfNeeded();
    this.geminiCallsToday += 1;
    const limit = parseInt(this.config.get<string>('GEMINI_DAILY_LIMIT', '500'), 10);
    this.logger.log(`Gemini classify call ${this.geminiCallsToday}/${limit} today`);
  }

  private resetGeminiCounterIfNeeded() {
    const today = this.currentDateKey();
    if (today !== this.geminiCallDate) {
      this.geminiCallDate = today;
      this.geminiCallsToday = 0;
    }
  }

  private currentDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  computeScore(
    classification: Classification,
    matchedServiceLines: number[],
    matchedIntentTerms: string[] = [],
  ): number {
    let score = 0;

    // Base relevance
    if (classification.is_relevant) score += 20;
    if (classification.is_nontechnical_founder) score += 15;

    // Intent to pay
    if (classification.intent_to_pay === 'explicit') score += 25;
    else if (classification.intent_to_pay === 'implied') score += 15;

    // Budget signal
    if (classification.budget_signal) score += 10;

    // Urgency
    if (classification.urgency === 'high') score += 15;
    else if (classification.urgency === 'medium') score += 8;

    // LLM confidence
    score += Math.round(classification.confidence * 15);

    // Service line priority boost (AI = +5, Chrome ext = +3)
    const sl = classification.service_line;
    if (sl === 1) score += 5;
    else if (sl === 2) score += 3;

    // Keyword intent terms boost score only; they never trigger Stage 1 by themselves.
    score += Math.min(10, matchedIntentTerms.length * 2);

    return Math.min(100, Math.max(0, score));
  }
}
