# Fit Coach AI

FitCoach AI — AI Fitness Accountability Coach

Build a modern, mobile-first fitness accountability web app called FitCoach AI.

Product Vision

FitCoach AI is an AI-powered personal fitness and habit coach designed for busy people who don't have time for a gym.

The app should help users:

Reduce body fat and improve body composition

Build consistent healthy habits

Track water, walking, workouts, sleep, nutrition and weight

Receive personalized AI coaching

Maintain daily and weekly streaks

See measurable progress over 30-day challenges

The product should feel like a premium consumer fitness app, not a generic admin dashboard.

Design Direction

Create a clean, modern, premium mobile-first interface inspired by apps such as Uber, Apple Health, Strava and modern AI products.

Visual style

Minimalist

Premium

Modern

Youthful

Clean typography

Rounded cards

Subtle shadows

Smooth animations

Lots of whitespace

Minimal gradients

Strong visual hierarchy

Responsive on mobile, tablet and desktop

Use a predominantly light interface with dark text and a strong fitness accent color.

Include a proper dark mode.

Avoid:

Cluttered dashboards

Excessive gradients

Generic stock fitness imagery

Overly complicated charts

Old-fashioned Bootstrap-style UI

Main Navigation

Mobile bottom navigation:

Home

Progress

Coach

Challenges

Profile

Desktop navigation should convert into a clean sidebar/top navigation.

1. Onboarding

Create a beautiful onboarding flow.

Collect:

Name

Age

Gender

Height

Weight

Waist measurement

Activity level

Primary goal

Available workout time

Gym access

Preferred workout location

Typical daily schedule

Goal options:

Lose belly fat

Lose weight

Build muscle

Improve fitness

Maintain weight

Build healthier habits

Workout availability:

5–10 minutes

15 minutes

20–30 minutes

30–60 minutes

Gym access:

Yes

No

The onboarding should generate a personalized starting plan.

2. Home Dashboard

The Home screen is the most important screen.

Show a friendly greeting:

"Good morning, Prosperous 👋"

Then show:

Today's Score

Large circular progress indicator:

75%

Label:

"Great progress today"

Below it show the daily habits.

Daily Goals

Cards/checklist for:

💧 Water

🚶 Walking

💪 Workout

😴 Sleep

🥗 Nutrition

Each goal should show:

Completed/not completed

Current progress

Target

Quick action button

Example:

Water

1.8L / 2.5L

Progress bar.

Button:

"+ Add Water"

3. Daily Habit Tracker

Create interactive habit cards.

Water

Allow the user to record:

250ml

500ml

750ml

1L

Show:

1.75L / 2.5L

Walking

Track:

Steps

Distance

Walking time

Example:

6,420 / 8,000 steps

Workout

Show today's recommended workout.

Example:

15-Minute Full Body

Exercises:

Squats

Push-ups

Lunges

Plank

Jumping jacks

Allow the user to mark the workout complete.

Sleep

Allow users to record sleep duration.

Example:

7h 30m

Nutrition

Allow users to mark:

Protein goal

Fruit/vegetable goal

No sugary drinks

No late-night snacks

4. Progress Dashboard

Create a beautiful analytics screen.

Show:

30-Day Progress

Weight trend

Waist trend

Habit completion

Workout consistency

Walking consistency

Sleep consistency

Use clean charts.

Include:

Starting Weight
Current Weight
Weight Change

and:

Starting Waist
Current Waist
Waist Change

Also show:

Habit Completion

Water: 86%

Walking: 72%

Workout: 80%

Sleep: 91%

Nutrition: 76%

Use progress bars.

5. Weekly Summary

Create a weekly review card.

Example:

Week 2 Summary

Overall Score: 84%

Water
6/7 days

Walking
5/7 days

Workout
4/4 days

Sleep
6/7 days

Then provide an AI-generated summary:

"You've had a strong second week. Your workout consistency is excellent, but your walking dropped on class days. Try taking a 15-minute walk immediately after lunch."

Include:

Wins

4 workouts completed

6 days hitting water target

5-day streak

Improve Next Week

Increase walking

Maintain sleep consistency

Reduce sugary drinks

6. AI Coach

This is the core differentiator.

Create a conversational AI coach screen.

UI should feel similar to a modern AI chat application.

Example:

User:

"I didn't workout today because I got home late from class."

AI:

"That's okay. You don't need a perfect week to make progress. Since you're short on time, let's do a 7-minute workout tonight instead."

Provide quick action buttons:

Start 7-min workout

Log today's progress

Ask about food

View today's plan

The AI should have access to the user's:

Profile

Goals

Daily habits

Previous workouts

Weight history

Waist history

Weekly performance

Schedule/preferences

The AI should give practical recommendations rather than generic motivational quotes.

7. Natural Language Logging

The user should eventually be able to type naturally:

"I drank 3 litres of water today."

The system should interpret this and update the water tracker.

Examples:

"I walked 5km"

"I slept 8 hours"

"I completed my workout"

"I ate eggs and beans for lunch"

"I didn't exercise today"

The AI should extract structured information from natural language and update the appropriate records.

Design the frontend/API architecture so this can later connect to the existing FastAPI AI backend.

8. 30-Day Challenge

Create a dedicated challenge screen.

Title:

30 Days to a Stronger Me

Show:

Day 12 / 30

Large progress indicator.

Daily challenge:

Today's Challenge

"Complete a 20-minute walk."

Checklist:

Water

Walk

Workout

Sleep

Nutrition

Show:

🔥 Current Streak: 7 days

Also include weekly milestones.

9. Workout Library

Create a workout library with categories:

5 Minute

10 Minute

15 Minute

20 Minute

Beginner

Full Body

Core

Lower Body

Upper Body

No Equipment

Each workout card should display:

Duration

Difficulty

Equipment

Calories estimate

Exercises

Allow users to start workouts.

10. Profile

Profile page should include:

Profile information

Goals

Height

Weight

Waist

Activity level

Workout preferences

Notification settings

Dark mode

AI coach preferences

Also include:

Export My Data

and:

Reset 30-Day Challenge

11. Streak System

Create a strong gamification system.

Show:

🔥 Current streak

🏆 Longest streak

📅 Days completed

🎯 Monthly completion

Award badges such as:

First 7 Days

10 Workouts

10,000 Steps

7-Day Water Streak

30-Day Finisher

Keep gamification tasteful and premium.

12. Backend Architecture

Use Supabase as the primary database/authentication layer.

Prepare the application architecture for these tables:

users

profiles

daily_logs

habits

workouts

workout_sessions

measurements

goals

challenges

challenge_progress

ai_conversations

ai_messages

streaks

achievements

Use proper relationships.

Do not store important application data only in frontend state.

13. Authentication

Implement:

Email/password authentication

Google authentication if supported

Protected routes

Persistent sessions

Logout

Profile creation after signup

14. API Architecture

The current AI backend is being developed separately using:

Python

FastAPI

Supabase

Twilio

AI API

Design the frontend so the AI service can later be connected through REST API endpoints.

Use a clean service layer rather than putting API calls directly into components.

Example:

src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── habits.ts
│   ├── progress.ts
│   └── coach.ts
├── types/
├── lib/
└── utils/


15. Important Product Principle

Do NOT build this as a complicated medical or clinical application.

It is a:

Fitness + habit accountability + AI coaching product.

The AI should provide general fitness and lifestyle guidance and encourage sustainable habits.

16. Responsive Design

The mobile experience is the priority.

The application must work beautifully at:

375px

390px

430px

Tablet

Desktop

The mobile dashboard should feel like a real native fitness application.

Use smooth page transitions and micro-interactions.

17. Demo Data

Create realistic demo data so the UI looks complete immediately.

Example user:

Prosperous

Age: 23

Height: 175cm

Weight: 72kg

Goal: Reduce body fat

Activity: Mostly sedentary

Workout availability: 15 minutes

Use realistic 30-day historical data for charts and progress.

Clearly separate demo data from real authenticated user data.

18. Build Quality

Before finishing:

Ensure all buttons work

No dead navigation

No placeholder lorem ipsum

No broken routes

No console errors

Proper loading states

Proper empty states

Proper error handling

Responsive layout

Accessible buttons/forms

Reusable components

Clean TypeScript

Clean component architecture

Do not simply create static screens.

Build the application as a functional product with real Supabase integration.

Start with the onboarding, authentication, Home dashboard, habit tracking, Progress dashboard, AI Coach interface, 30-Day Challenge, and Profile.

After completing the first implementation, provide a concise summary of the architecture and what remains to connect to the FastAPI/Twilio AI backend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1b60340-cf1a-4940-878a-7444aa40656f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
