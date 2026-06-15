# LeadRadar

LeadRadar is a personal lead-monitoring dashboard that helps organize public posts from developer, startup, and product communities for manual review.

This repository is being provided for a Reddit Data API access request. The Reddit integration is a read-only connector that searches selected public subreddits and stores matching public posts in a private dashboard.

## Reddit API Use

The Reddit connector may read public Reddit data such as:

* Public post titles
* Public post body text
* Public subreddit name
* Public post URL/permalink
* Public timestamps
* Public comments when needed for context

The Reddit connector does not access private messages, private user data, deleted content, hidden content, or non-public Reddit data.

## What the App Does

The app monitors selected public communities for posts where users are asking for help, feedback, or technical/product input. Matching posts are saved to a dashboard so they can be manually reviewed.

The app may send a private notification to the owner through a notification service such as ntfy when a relevant public post is found. The notification only contains enough context to manually open and review the post.

## What the App Does Not Do

The app does not:

* Automatically comment
* Automatically post
* Automatically send private messages
* Automatically vote
* Follow users
* Join communities
* Bypass Reddit rate limits
* Resell or redistribute Reddit data
* Build public user profiles
* Scrape private or restricted content

Any response to a Reddit post is manually written and submitted by a human through Reddit's normal interface.

## Scope

LeadRadar is an external dashboard and notification tool. It is not a Reddit-hosted app, moderation tool, subreddit game, or interactive in-community Devvit experience.

The Reddit connector is only one source connector in the system. Each platform connector is designed to use official APIs where available and respect the relevant platform rules.

## Environment Variables

Create a local `.env` file using `.env.example`. Never commit real secrets.
