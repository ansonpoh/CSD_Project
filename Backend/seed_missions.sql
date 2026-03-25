-- Run this ONCE after the learning-service has started and auto-created the missions schema/tables.
-- Seeds the initial Gen Alpha real-world mission pool.

CREATE SCHEMA IF NOT EXISTS missions;

INSERT INTO missions.mission (mission_id, title, description, type, reward_xp, reward_gold, is_active, created_at)
VALUES
  (gen_random_uuid(), 'The Scroll Watcher',
   'Spend 5 minutes watching a platform used by Gen Alpha (TikTok, YouTube Shorts, Roblox, etc). Observe one thing that surprised or confused you. Reflect: what does this reveal about how they consume content?',
   'OBSERVATION', 50, 20, true, NOW()),

  (gen_random_uuid(), 'Slang Encounter',
   'Listen for or encounter a word or phrase used by someone younger than 15 that you did not understand. Look it up. Reflect: what does this term mean, and what does it say about how Gen Alpha communicates?',
   'OBSERVATION', 50, 20, true, NOW()),

  (gen_random_uuid(), 'Ask and Listen',
   'Ask someone from Gen Alpha (born 2010 or later) what their favourite app or game is and why. Reflect: what surprised you about their answer? What values or interests did it reveal?',
   'INTERACTION', 60, 25, true, NOW()),

  (gen_random_uuid(), 'Screen Time Snapshot',
   'Observe how a Gen Alpha person uses their phone or device for 10 minutes without interrupting them. Reflect: how does their behaviour differ from how you use technology?',
   'OBSERVATION', 50, 20, true, NOW()),

  (gen_random_uuid(), 'The Meme Decoder',
   'Find a meme or trend that is currently popular with Gen Alpha (ask someone younger or search online). Reflect: what is the humour or cultural reference behind it? Could you explain it to a peer your age?',
   'OBSERVATION', 50, 20, true, NOW()),

  (gen_random_uuid(), 'Opinion Exchange',
   'Start a conversation with someone under 16 about a topic you both care about — climate, school, gaming, music, etc. Reflect: what perspective did they share that you had not considered before?',
   'INTERACTION', 70, 30, true, NOW()),

  (gen_random_uuid(), 'The Creator Mindset',
   'Watch one video made by a Gen Alpha content creator (not a professional studio). Reflect: what motivated them to create it? What does it tell you about how this generation sees self-expression?',
   'OBSERVATION', 50, 20, true, NOW()),

  (gen_random_uuid(), 'Friendship Dynamics',
   'Observe or ask about how a Gen Alpha person maintains friendships — through games, group chats, social media, etc. Reflect: how is this different from how you made and kept friends at that age?',
   'OBSERVATION', 55, 22, true, NOW()),

  (gen_random_uuid(), 'The Learning Style',
   'Watch how a Gen Alpha person learns something new — a game mechanic, a recipe, a skill. Observe their process. Reflect: do they read instructions, watch a video, or figure it out by doing? What does this say about how they learn?',
   'OBSERVATION', 60, 25, true, NOW()),

  (gen_random_uuid(), 'World Through Their Eyes',
   'Ask a Gen Alpha person what they worry about most or what they wish adults understood about their generation. Reflect: did their answer change how you see them?',
   'INTERACTION', 80, 35, true, NOW());
