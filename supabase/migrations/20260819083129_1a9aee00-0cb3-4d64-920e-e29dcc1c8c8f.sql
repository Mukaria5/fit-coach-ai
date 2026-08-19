
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  age INT,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  waist_cm NUMERIC,
  activity_level TEXT,
  primary_goal TEXT,
  workout_minutes TEXT,
  gym_access BOOLEAN DEFAULT false,
  workout_location TEXT,
  daily_schedule TEXT,
  water_target_ml INT NOT NULL DEFAULT 2500,
  steps_target INT NOT NULL DEFAULT 8000,
  sleep_target_min INT NOT NULL DEFAULT 450,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  coach_tone TEXT NOT NULL DEFAULT 'supportive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- daily_logs
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  water_ml INT NOT NULL DEFAULT 0,
  steps INT NOT NULL DEFAULT 0,
  walk_km NUMERIC NOT NULL DEFAULT 0,
  walk_minutes INT NOT NULL DEFAULT 0,
  sleep_minutes INT NOT NULL DEFAULT 0,
  workout_done BOOLEAN NOT NULL DEFAULT false,
  nutrition_protein BOOLEAN NOT NULL DEFAULT false,
  nutrition_produce BOOLEAN NOT NULL DEFAULT false,
  nutrition_no_sugar BOOLEAN NOT NULL DEFAULT false,
  nutrition_no_late_snack BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.daily_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- measurements
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  measured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  waist_cm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurements TO authenticated;
GRANT ALL ON public.measurements TO service_role;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measurements" ON public.measurements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric TEXT,
  target_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workouts library (shared, read-only)
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  duration_min INT NOT NULL,
  difficulty TEXT NOT NULL,
  equipment TEXT NOT NULL DEFAULT 'None',
  calories INT NOT NULL DEFAULT 0,
  categories TEXT[] NOT NULL DEFAULT '{}',
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workouts TO authenticated, anon;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts readable" ON public.workouts FOR SELECT TO authenticated, anon USING (true);

-- workout_sessions
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts ON DELETE SET NULL,
  workout_title TEXT,
  duration_min INT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- challenges (shared)
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_days INT NOT NULL DEFAULT 30,
  daily_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO authenticated, anon;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges readable" ON public.challenges FOR SELECT TO authenticated, anon USING (true);

-- challenge_progress
CREATE TABLE public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges ON DELETE CASCADE,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_days INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenge progress" ON public.challenge_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Coach chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.ai_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_messages
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.ai_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL,
  earned_on DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER daily_logs_touch BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER challenge_progress_touch BEFORE UPDATE ON public.challenge_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed workout library
INSERT INTO public.workouts (slug, title, duration_min, difficulty, equipment, calories, categories, exercises, description) VALUES
('quick-core-5','5-Minute Core Burner',5,'Beginner','None',45,'{5 Minute,Core,No Equipment,Beginner}','[{"name":"Plank","detail":"40s"},{"name":"Crunches","detail":"20 reps"},{"name":"Dead bug","detail":"30s"},{"name":"Mountain climbers","detail":"30s"}]','A fast core activation you can do beside your bed.'),
('wake-up-5','5-Minute Wake Up Flow',5,'Beginner','None',40,'{5 Minute,Full Body,No Equipment,Beginner}','[{"name":"Jumping jacks","detail":"40s"},{"name":"Air squats","detail":"15 reps"},{"name":"Arm circles","detail":"30s"},{"name":"Standing march","detail":"45s"}]','Gentle full body wake-up to start the day moving.'),
('full-body-10','10-Minute Full Body',10,'Beginner','None',85,'{10 Minute,Full Body,No Equipment,Beginner}','[{"name":"Squats","detail":"15 reps"},{"name":"Push-ups","detail":"10 reps"},{"name":"Reverse lunges","detail":"10 each side"},{"name":"Plank","detail":"40s"},{"name":"Jumping jacks","detail":"45s"}]','The go-to session when the day gets away from you.'),
('lower-body-10','10-Minute Lower Body',10,'Intermediate','None',95,'{10 Minute,Lower Body,No Equipment}','[{"name":"Squats","detail":"20 reps"},{"name":"Glute bridges","detail":"20 reps"},{"name":"Split squats","detail":"12 each side"},{"name":"Calf raises","detail":"25 reps"}]','Legs and glutes without a single dumbbell.'),
('full-body-15','15-Minute Full Body',15,'Beginner','None',130,'{15 Minute,Full Body,No Equipment,Beginner}','[{"name":"Squats","detail":"3 x 15"},{"name":"Push-ups","detail":"3 x 10"},{"name":"Lunges","detail":"3 x 10 each"},{"name":"Plank","detail":"3 x 40s"},{"name":"Jumping jacks","detail":"3 x 45s"}]','Your default daily session: five moves, three rounds.'),
('core-15','15-Minute Core & Waist',15,'Intermediate','None',120,'{15 Minute,Core,No Equipment}','[{"name":"Plank","detail":"3 x 45s"},{"name":"Bicycle crunches","detail":"3 x 20"},{"name":"Leg raises","detail":"3 x 12"},{"name":"Side plank","detail":"2 x 30s each"},{"name":"Hollow hold","detail":"3 x 20s"}]','Targets the midsection with slow, controlled work.'),
('upper-body-15','15-Minute Upper Body',15,'Intermediate','None',125,'{15 Minute,Upper Body,No Equipment}','[{"name":"Push-ups","detail":"4 x 10"},{"name":"Pike push-ups","detail":"3 x 8"},{"name":"Triceps dips","detail":"3 x 12"},{"name":"Superman hold","detail":"3 x 30s"}]','Chest, shoulders and arms using bodyweight only.'),
('hiit-20','20-Minute Fat Burn HIIT',20,'Advanced','None',210,'{20 Minute,Full Body,No Equipment}','[{"name":"Burpees","detail":"40s on / 20s off"},{"name":"High knees","detail":"40s"},{"name":"Squat jumps","detail":"40s"},{"name":"Push-ups","detail":"40s"},{"name":"Plank jacks","detail":"40s"}]','Four rounds of intervals for a big calorie burn.'),
('gym-strength-20','20-Minute Gym Strength',20,'Intermediate','Dumbbells',180,'{20 Minute,Full Body,Upper Body}','[{"name":"Goblet squat","detail":"3 x 12"},{"name":"Dumbbell row","detail":"3 x 12"},{"name":"Dumbbell press","detail":"3 x 10"},{"name":"Romanian deadlift","detail":"3 x 12"},{"name":"Farmer carry","detail":"3 x 40s"}]','A compact strength circuit if you have access to weights.'),
('walk-mobility-10','10-Minute Walk & Mobility',10,'Beginner','None',60,'{10 Minute,Beginner,No Equipment,Full Body}','[{"name":"Brisk walk","detail":"6 min"},{"name":"Hip openers","detail":"1 min"},{"name":"Hamstring stretch","detail":"1 min"},{"name":"Thoracic twists","detail":"2 min"}]','Active recovery for rest days and late nights.');

-- seed challenge
INSERT INTO public.challenges (slug, title, description, total_days, daily_tasks) VALUES
('30-days-stronger','30 Days to a Stronger Me','Build five daily habits over 30 days: water, walking, workouts, sleep and nutrition.',30,
'["Drink your full water target","Complete a 20-minute walk","Do your recommended workout","Get 7+ hours of sleep","Hit your protein goal","No sugary drinks today","Walk 10 minutes after every meal","Add one extra vegetable serving","Lights out 30 minutes earlier","Take the stairs all day"]');
