create schema if not exists roles;

create table if not exists roles.learner_profile_state (
    learner_id uuid primary key references roles.learner(learner_id) on delete cascade,
    avatar_preset varchar(64) not null,
    daily_quest_date_key date not null,
    daily_quest_progress text not null default '{}',
    daily_quest_streak integer not null default 0,
    daily_quest_last_completed_date date,
    learning_streak integer not null default 0,
    learning_streak_last_completed_date date,
    created_at timestamp without time zone not null default current_timestamp,
    updated_at timestamp without time zone not null default current_timestamp
);
