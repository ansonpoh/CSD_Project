create schema if not exists animations;

create table if not exists animations.animation (
    animation_id uuid primary key,
    asset varchar(255),
    storage_path varchar(255),
    description varchar(255),
    created_at timestamp without time zone default current_timestamp
);

create table if not exists monsters.monster_animation (
    monster_animation_id uuid primary key,
    monster_id uuid references monsters.monster (monster_id),
    animation_id uuid references animations.animation (animation_id),
    event varchar(255)
);

create index if not exists idx_monster_animation_monster_id
    on monsters.monster_animation (monster_id);

create index if not exists idx_monster_animation_animation_id
    on monsters.monster_animation (animation_id);
