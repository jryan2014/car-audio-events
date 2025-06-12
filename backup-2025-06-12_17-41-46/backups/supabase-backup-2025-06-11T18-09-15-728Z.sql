

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" integer NOT NULL,
    "setting_key" character varying(255) NOT NULL,
    "setting_value" "text",
    "setting_type" character varying(50) DEFAULT 'text'::character varying,
    "is_encrypted" boolean DEFAULT false,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."admin_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_settings_id_seq" OWNED BY "public"."admin_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."advertisements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "image_url" "text",
    "target_url" "text",
    "placement" character varying(50) NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "click_count" integer DEFAULT 0,
    "impression_count" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertisements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audio_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audio_system_id" "uuid",
    "component_type" character varying(50) NOT NULL,
    "brand" character varying(100),
    "model" character varying(255),
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "price" numeric(10,2),
    "installation_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audio_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "icon" character varying(100),
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."cms_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "content" "text",
    "meta_title" character varying(255),
    "meta_description" "text",
    "meta_keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "is_featured" boolean DEFAULT false,
    "author_id" "uuid",
    "published_at" timestamp with time zone,
    "navigation_placement" character varying(20) DEFAULT 'none'::character varying,
    "parent_nav_item" character varying(255),
    "footer_section" character varying(50),
    "nav_order" integer DEFAULT 0,
    "nav_title" character varying(255),
    "show_in_sitemap" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cms_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer,
    "category" character varying(100) NOT NULL,
    "position" integer,
    "score" numeric(10,2),
    "notes" "text",
    "verified" boolean DEFAULT false,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."competition_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuration_categories" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuration_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."configuration_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuration_categories_id_seq" OWNED BY "public"."configuration_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."configuration_options" (
    "id" integer NOT NULL,
    "category_id" integer,
    "name" character varying(255) NOT NULL,
    "value" character varying(255) NOT NULL,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration_options" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuration_options_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."configuration_options_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuration_options_id_seq" OWNED BY "public"."configuration_options"."id";



CREATE TABLE IF NOT EXISTS "public"."event_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" integer,
    "metric_name" character varying(100) NOT NULL,
    "metric_value" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer,
    "checked_in_at" timestamp with time zone,
    "checked_out_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" integer,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "display_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "registration_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" integer NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100) NOT NULL,
    "organization_id" integer,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "venue_name" character varying(255),
    "address" "text",
    "city" character varying(255),
    "state" character varying(100),
    "zip_code" character varying(20),
    "country" character varying(100) DEFAULT 'USA'::character varying,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "ticket_price" numeric(10,2),
    "max_participants" integer,
    "current_participants" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "rules" "text",
    "image_url" "text",
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "website_url" "text",
    "registration_deadline" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";



CREATE TABLE IF NOT EXISTS "public"."form_field_configurations" (
    "id" integer NOT NULL,
    "form_name" character varying(255) NOT NULL,
    "field_name" character varying(255) NOT NULL,
    "field_type" character varying(50) DEFAULT 'text'::character varying NOT NULL,
    "is_required" boolean DEFAULT false,
    "placeholder_text" "text",
    "help_text" "text",
    "validation_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."form_field_configurations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."form_field_configurations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."form_field_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."form_field_configurations_id_seq" OWNED BY "public"."form_field_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."membership_plans" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "billing_cycle" character varying(20) DEFAULT 'monthly'::character varying,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "max_events" integer,
    "max_participants" integer,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."membership_plans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."membership_plans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."membership_plans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."membership_plans_id_seq" OWNED BY "public"."membership_plans"."id";



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "logo_url" "text",
    "small_logo_url" "text",
    "description" "text",
    "website" "text",
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "organization_type" character varying(50) DEFAULT 'competition'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "competition_classes" "jsonb" DEFAULT '[]'::"jsonb",
    "default_rules_template_id" integer,
    "address" "text",
    "city" character varying(255),
    "state" character varying(100),
    "zip_code" character varying(20),
    "country" character varying(100) DEFAULT 'USA'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rules_templates" (
    "id" integer NOT NULL,
    "organization_name" character varying(255),
    "name" character varying(255) NOT NULL,
    "description" "text",
    "rules_content" "text" NOT NULL,
    "version" character varying(50) DEFAULT '1.0'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rules_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."organization_config_view" AS
 SELECT "o"."id",
    "o"."name",
    "o"."logo_url",
    "o"."small_logo_url",
    "o"."description",
    "o"."organization_type",
    "o"."status",
    "o"."competition_classes",
    "o"."default_rules_template_id",
    "rt"."name" AS "default_rules_name",
    "rt"."rules_content" AS "default_rules_content"
   FROM ("public"."organizations" "o"
     LEFT JOIN "public"."rules_templates" "rt" ON (("o"."default_rules_template_id" = "rt"."id")))
  WHERE (("o"."status")::"text" = 'active'::"text");


ALTER TABLE "public"."organization_config_view" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."organizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."organizations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."organizations_id_seq" OWNED BY "public"."organizations"."id";



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" integer NOT NULL,
    "role_name" character varying(100) NOT NULL,
    "permission" character varying(100) NOT NULL,
    "resource" character varying(100) NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."role_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."role_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."role_permissions_id_seq" OWNED BY "public"."role_permissions"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."rules_templates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."rules_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rules_templates_id_seq" OWNED BY "public"."rules_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "user_id" "uuid",
    "role" character varying(50) DEFAULT 'member'::character varying,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "owner_id" "uuid",
    "is_public" boolean DEFAULT true,
    "max_members" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_audio_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(255) NOT NULL,
    "description" "text",
    "vehicle_year" integer,
    "vehicle_make" character varying(100),
    "vehicle_model" character varying(100),
    "system_type" character varying(50),
    "total_value" numeric(10,2),
    "is_primary" boolean DEFAULT false,
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_audio_systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(255),
    "membership_type" character varying(50) DEFAULT 'free'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "location" "text",
    "phone" character varying(50),
    "website" "text",
    "bio" "text",
    "company_name" character varying(255),
    "verification_status" character varying(20) DEFAULT 'pending'::character varying,
    "subscription_plan" character varying(50) DEFAULT 'free'::character varying,
    "password_changed_at" timestamp with time zone,
    "two_factor_enabled" boolean DEFAULT false,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."configuration_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuration_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."configuration_options" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuration_options_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."form_field_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."form_field_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."membership_plans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."membership_plans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."organizations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."role_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."role_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rules_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rules_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audio_components"
    ADD CONSTRAINT "audio_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration_categories"
    ADD CONSTRAINT "configuration_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."configuration_categories"
    ADD CONSTRAINT "configuration_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_category_id_value_key" UNIQUE ("category_id", "value");



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_analytics"
    ADD CONSTRAINT "event_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_favorites"
    ADD CONSTRAINT "event_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_favorites"
    ADD CONSTRAINT "event_favorites_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."event_images"
    ADD CONSTRAINT "event_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_field_configurations"
    ADD CONSTRAINT "form_field_configurations_form_name_field_name_key" UNIQUE ("form_name", "field_name");



ALTER TABLE ONLY "public"."form_field_configurations"
    ADD CONSTRAINT "form_field_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_plans"
    ADD CONSTRAINT "membership_plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."membership_plans"
    ADD CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_name_permission_resource_key" UNIQUE ("role_name", "permission", "resource");



ALTER TABLE ONLY "public"."rules_templates"
    ADD CONSTRAINT "rules_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_audio_systems"
    ADD CONSTRAINT "user_audio_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audio_components"
    ADD CONSTRAINT "audio_components_audio_system_id_fkey" FOREIGN KEY ("audio_system_id") REFERENCES "public"."user_audio_systems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."configuration_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_analytics"
    ADD CONSTRAINT "event_analytics_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_favorites"
    ADD CONSTRAINT "event_favorites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_favorites"
    ADD CONSTRAINT "event_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_images"
    ADD CONSTRAINT "event_images_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "fk_organizations_rules_template" FOREIGN KEY ("default_rules_template_id") REFERENCES "public"."rules_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_audio_systems"
    ADD CONSTRAINT "user_audio_systems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access" ON "public"."categories" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin full access" ON "public"."cms_pages" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Authenticated write access" ON "public"."events" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Public can view public audio systems" ON "public"."user_audio_systems" FOR SELECT TO "authenticated", "anon" USING (("is_public" = true));



CREATE POLICY "Public can view public teams" ON "public"."teams" FOR SELECT TO "authenticated", "anon" USING (("is_public" = true));



CREATE POLICY "Public read access" ON "public"."advertisements" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public read access" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."cms_pages" FOR SELECT TO "authenticated", "anon" USING ((("status")::"text" = 'published'::"text"));



CREATE POLICY "Public read access" ON "public"."configuration_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."configuration_options" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."events" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."form_field_configurations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."membership_plans" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public read access" ON "public"."organizations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."rules_templates" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Team members can view their memberships" ON "public"."team_members" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Team owners can manage memberships" ON "public"."team_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own audio systems" ON "public"."user_audio_systems" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own components" ON "public"."audio_components" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_audio_systems" "uas"
  WHERE (("uas"."id" = "audio_components"."audio_system_id") AND ("uas"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_audio_systems" "uas"
  WHERE (("uas"."id" = "audio_components"."audio_system_id") AND ("uas"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own data" ON "public"."users" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their own favorites" ON "public"."event_favorites" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own registrations" ON "public"."event_registrations" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own results" ON "public"."competition_results" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their teams" ON "public"."teams" TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can view competition results" ON "public"."competition_results" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view other users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audio_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuration_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuration_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_field_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rules_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_audio_systems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."advertisements" TO "anon";
GRANT ALL ON TABLE "public"."advertisements" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements" TO "service_role";



GRANT ALL ON TABLE "public"."audio_components" TO "anon";
GRANT ALL ON TABLE "public"."audio_components" TO "authenticated";
GRANT ALL ON TABLE "public"."audio_components" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cms_pages" TO "anon";
GRANT ALL ON TABLE "public"."cms_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_pages" TO "service_role";



GRANT ALL ON TABLE "public"."competition_results" TO "anon";
GRANT ALL ON TABLE "public"."competition_results" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_results" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_categories" TO "anon";
GRANT ALL ON TABLE "public"."configuration_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_options" TO "anon";
GRANT ALL ON TABLE "public"."configuration_options" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_analytics" TO "anon";
GRANT ALL ON TABLE "public"."event_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."event_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."event_attendance" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."event_favorites" TO "anon";
GRANT ALL ON TABLE "public"."event_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."event_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."event_images" TO "anon";
GRANT ALL ON TABLE "public"."event_images" TO "authenticated";
GRANT ALL ON TABLE "public"."event_images" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."form_field_configurations" TO "anon";
GRANT ALL ON TABLE "public"."form_field_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."form_field_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."membership_plans" TO "anon";
GRANT ALL ON TABLE "public"."membership_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_plans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."membership_plans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."membership_plans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."membership_plans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."rules_templates" TO "anon";
GRANT ALL ON TABLE "public"."rules_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."rules_templates" TO "service_role";



GRANT ALL ON TABLE "public"."organization_config_view" TO "anon";
GRANT ALL ON TABLE "public"."organization_config_view" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_config_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_audio_systems" TO "anon";
GRANT ALL ON TABLE "public"."user_audio_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."user_audio_systems" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
