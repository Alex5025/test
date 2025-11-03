create table tags
(
    tag_name         varchar(20),
    tag_group        varchar(10),
    update_id        varchar(20),
    update_timestamp timestamp,
    constraint tags_pk
        unique (tag_name, tag_group)
);

comment on table tags is '所有模板集合';

comment on column tags.tag_name is '模板名稱';

comment on column tags.tag_group is '模板群組(業務、情境、功能、佈局)';

alter table tags
    owner to postgres;

create table templates
(
    template_id         varchar(32) not null
        constraint templates_pk
            primary key,
    json_data_layout    jsonb       not null,
    json_data_situation jsonb,
    json_data_business  jsonb,
    json_data_function  jsonb,
    update_id           varchar(20) not null,
    update_timestamp    timestamp   not null
);

comment on column templates.json_data_layout is ' 佈局';

comment on column templates.json_data_situation is '情境';

comment on column templates.json_data_business is '業務';

comment on column templates.json_data_function is '功能';

alter table templates
    owner to postgres;