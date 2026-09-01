-- ============ REFERENCE DATA ============
CREATE TABLE public.food_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_categories TO anon, authenticated;
GRANT ALL ON public.food_categories TO service_role;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food categories readable" ON public.food_categories FOR SELECT USING (true);

CREATE TABLE public.foods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  local_names text[] NOT NULL DEFAULT '{}',
  category_slug text NOT NULL,
  serving_label text NOT NULL,
  serving_grams numeric,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  price_ksh numeric,
  tags text[] NOT NULL DEFAULT '{}',
  good_for text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foods TO anon, authenticated;
GRANT ALL ON public.foods TO service_role;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods readable" ON public.foods FOR SELECT USING (true);

CREATE TABLE public.meals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meal_type text NOT NULL,
  description text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  cost_ksh numeric,
  prep_minutes integer,
  tags text[] NOT NULL DEFAULT '{}',
  good_for text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meals TO anon, authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals readable" ON public.meals FOR SELECT USING (true);

-- ============ USER DATA ============
CREATE TABLE public.nutrition_preferences (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_budget_ksh numeric NOT NULL DEFAULT 400,
  diet_type text NOT NULL DEFAULT 'omnivore',
  allergies text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  meals_per_day integer NOT NULL DEFAULT 3,
  eating_schedule text,
  cooking_style text NOT NULL DEFAULT 'home',
  calorie_target integer,
  protein_target_g integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_preferences TO authenticated;
GRANT ALL ON public.nutrition_preferences TO service_role;
ALTER TABLE public.nutrition_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition preferences" ON public.nutrition_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER nutrition_preferences_touch BEFORE UPDATE ON public.nutrition_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Meal plan',
  plan_type text NOT NULL DEFAULT 'daily',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  budget_ksh numeric,
  total_cost_ksh numeric,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal plans" ON public.meal_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER meal_plans_touch BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.meal_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  time_slot text,
  title text NOT NULL,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  cost_ksh numeric,
  notes text,
  eaten boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_items TO authenticated;
GRANT ALL ON public.meal_plan_items TO service_role;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal plan items" ON public.meal_plan_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.nutrition_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'snack',
  description text NOT NULL,
  food_slug text,
  servings numeric NOT NULL DEFAULT 1,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  cost_ksh numeric,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;
GRANT ALL ON public.nutrition_logs TO service_role;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition logs" ON public.nutrition_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX nutrition_logs_user_date_idx ON public.nutrition_logs (user_id, log_date DESC);

CREATE TABLE public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Shopping list',
  total_cost_ksh numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shopping lists" ON public.shopping_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shopping_lists_touch BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.shopping_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  category_slug text,
  estimated_cost_ksh numeric,
  bought boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shopping list items" ON public.shopping_list_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SEED: CATEGORIES ============
INSERT INTO public.food_categories (slug, name, sort_order) VALUES
  ('staples','Staples & starches',1),
  ('proteins','Proteins',2),
  ('vegetables','Vegetables',3),
  ('legumes','Legumes',4),
  ('fruits','Fruits',5),
  ('dairy','Dairy',6),
  ('fats','Fats & nuts',7),
  ('drinks','Drinks',8),
  ('street','Street & kibanda',9);

-- ============ SEED: KENYAN FOODS ============
INSERT INTO public.foods (slug,name,local_names,category_slug,serving_label,serving_grams,calories,protein_g,carbs_g,fat_g,fiber_g,price_ksh,tags,good_for,notes) VALUES
('ugali','Ugali','{"Sima","Posho"}','staples','1 fist-sized piece',200,222,5.6,48,1.0,2.4,20,'{cheap,home,kibanda}','{muscle_gain,maintenance}','Portion control matters for weight loss.'),
('brown-ugali','Brown ugali (whole maize)','{"Ugali wa dona"}','staples','1 fist-sized piece',200,210,6.2,44,1.6,5.0,25,'{cheap,home}','{weight_loss,maintenance}','Higher fibre than white ugali.'),
('rice-white','White rice','{"Wali"}','staples','1 cup cooked',180,205,4.3,45,0.4,0.6,30,'{home,kibanda}','{muscle_gain,maintenance}',NULL),
('pilau','Pilau','{"Pilau"}','staples','1 cup',200,300,6.5,45,9.5,1.5,80,'{kibanda,festive}','{maintenance}','Oil-heavy; keep to one serving.'),
('chapati','Chapati','{"Chapo"}','staples','1 piece',80,300,6.0,45,10.0,2.0,20,'{home,kibanda}','{muscle_gain}','Oily; 1 piece not 3.'),
('sweet-potato','Sweet potato','{"Ngwaci","Viazi tamu"}','staples','1 medium',150,130,2.0,30,0.2,4.5,30,'{cheap,home}','{weight_loss,maintenance}',NULL),
('arrowroot','Arrowroot','{"Nduma"}','staples','1 medium piece',120,120,1.5,28,0.2,3.0,50,'{home}','{weight_loss}',NULL),
('irish-potato','Boiled potatoes','{"Viazi"}','staples','1 cup',150,130,3.0,29,0.2,2.5,25,'{cheap,home}','{maintenance}',NULL),
('matoke','Matoke (green bananas)','{"Matoke","Ndizi"}','staples','1 cup',180,160,1.6,38,0.3,3.6,40,'{home}','{maintenance,weight_loss}',NULL),
('githeri','Githeri (maize & beans)','{"Githeri","Muthokoi"}','legumes','1 cup',220,290,15.0,48,3.0,11.0,50,'{cheap,home,kibanda}','{weight_loss,muscle_gain,maintenance}','Cheap complete protein combo.'),
('ndengu','Green grams','{"Ndengu","Pojo"}','legumes','1 cup cooked',200,212,14.0,38,0.8,15.0,45,'{cheap,home}','{weight_loss,muscle_gain}',NULL),
('beans-stew','Beans stew','{"Maharagwe"}','legumes','1 cup',200,240,14.5,40,2.5,13.0,45,'{cheap,home,kibanda}','{weight_loss,muscle_gain}',NULL),
('njahi','Black beans','{"Njahi"}','legumes','1 cup cooked',200,230,15.0,40,1.0,14.0,70,'{home}','{muscle_gain,weight_loss}',NULL),
('lentils','Lentils','{"Kamande"}','legumes','1 cup cooked',200,230,17.9,40,0.8,15.6,60,'{home}','{weight_loss,muscle_gain}',NULL),
('sukuma-wiki','Sukuma wiki (kale)','{"Sukuma"}','vegetables','1 cup cooked',130,60,3.5,7.0,2.5,3.0,20,'{cheap,home,kibanda}','{weight_loss,maintenance,muscle_gain}','Cook with minimal oil.'),
('cabbage','Cabbage','{"Kabichi"}','vegetables','1 cup cooked',150,45,1.8,8.0,1.2,3.0,15,'{cheap,home}','{weight_loss}',NULL),
('managu','Managu (African nightshade)','{"Managu"}','vegetables','1 cup cooked',130,70,4.5,7.0,2.0,3.5,30,'{home,traditional}','{weight_loss,maintenance}',NULL),
('terere','Terere (amaranth greens)','{"Terere","Mchicha"}','vegetables','1 cup cooked',130,65,4.0,7.0,1.8,3.2,30,'{home,traditional}','{weight_loss,maintenance}',NULL),
('spinach','Spinach','{"Spinach"}','vegetables','1 cup cooked',130,55,3.5,6.0,2.0,2.8,30,'{home}','{weight_loss}',NULL),
('kienyeji-veg-mix','Traditional greens mix','{"Kienyeji"}','vegetables','1 cup cooked',130,70,4.2,7.5,2.0,3.5,35,'{home,traditional}','{weight_loss,maintenance}',NULL),
('tomato-onion-salad','Tomato & onion kachumbari','{"Kachumbari"}','vegetables','1 small bowl',100,30,1.0,6.0,0.2,1.5,20,'{cheap,home,kibanda}','{weight_loss,maintenance}',NULL),
('sukuma-avocado','Avocado','{"Avocado","Parachichi"}','fats','1/2 medium',100,160,2.0,8.5,14.7,6.7,20,'{cheap,home}','{weight_loss,maintenance,muscle_gain}','Great cheap healthy fat.'),
('groundnuts','Groundnuts','{"Njugu karanga"}','fats','1 handful',30,170,7.3,4.8,14.5,2.5,25,'{cheap,street}','{muscle_gain,maintenance}',NULL),
('sunflower-oil','Cooking oil','{"Mafuta"}','fats','1 tbsp',14,120,0,0,14,0,10,'{home}','{maintenance}','Measure it; oil is the hidden calorie.'),
('eggs','Boiled eggs','{"Mayai"}','proteins','2 eggs',100,155,13.0,1.1,10.6,0,40,'{cheap,home,street}','{muscle_gain,weight_loss,maintenance}',NULL),
('omena','Omena (silver cyprinid)','{"Omena","Dagaa"}','proteins','1 cup cooked',100,200,25.0,3.0,9.0,0,50,'{cheap,home,traditional}','{muscle_gain,weight_loss}','Very cheap protein and calcium.'),
('tilapia','Tilapia (fried)','{"Ngege"}','proteins','1 medium fish',200,260,34.0,3.0,12.0,0,250,'{home,restaurant}','{muscle_gain,weight_loss}',NULL),
('nyama-choma','Nyama choma (goat)','{"Nyama choma"}','proteins','1/4 kg',250,600,52.0,0,42.0,0,400,'{festive,restaurant}','{muscle_gain}','Occasional; pair with kachumbari not chips.'),
('beef-stew','Beef stew','{"Nyama ya kupika"}','proteins','1 cup',200,320,30.0,4.0,20.0,0.5,180,'{home,kibanda}','{muscle_gain,maintenance}',NULL),
('chicken-boiled','Boiled/grilled chicken','{"Kuku"}','proteins','1 piece',150,250,32.0,0,13.0,0,200,'{home,restaurant}','{muscle_gain,weight_loss}',NULL),
('kuku-kienyeji','Kuku kienyeji stew','{"Kuku kienyeji"}','proteins','1 piece',150,230,31.0,2.0,11.0,0,300,'{home,traditional}','{muscle_gain}',NULL),
('matumbo','Matumbo','{"Matumbo"}','proteins','1 cup',180,300,26.0,3.0,20.0,0,120,'{kibanda,cheap}','{muscle_gain}',NULL),
('liver','Liver (fried)','{"Maini"}','proteins','1 cup',150,290,32.0,6.0,14.0,0,180,'{home,kibanda}','{muscle_gain}','Iron-rich.'),
('sausage','Sausage','{"Smokie","Soseji"}','street','1 piece',60,180,7.0,6.0,14.0,0,50,'{street}','{maintenance}','Processed; keep it rare.'),
('mandazi','Mandazi','{"Mandazi"}','street','1 piece',70,240,4.0,32.0,10.0,1.0,20,'{cheap,street}','{maintenance}','Deep fried; treat, not breakfast staple.'),
('samosa','Samosa','{"Sambusa"}','street','1 piece',60,230,6.0,20.0,14.0,1.2,30,'{street}','{maintenance}',NULL),
('chips','Chips (fries)','{"Chipo"}','street','1 medium portion',200,600,7.0,70.0,30.0,5.0,120,'{street,kibanda}','{maintenance}','Biggest weight-loss trap on this list.'),
('milk','Fresh milk','{"Maziwa"}','dairy','1 cup',250,150,8.0,12.0,8.0,0,60,'{home}','{muscle_gain,maintenance}',NULL),
('mala','Mala (fermented milk)','{"Mala","Maziwa lala"}','dairy','1 cup',250,140,8.0,12.0,7.0,0,70,'{home}','{muscle_gain,maintenance}',NULL),
('yoghurt','Plain yoghurt','{"Yoghurt"}','dairy','1 cup',250,150,9.0,17.0,4.0,0,120,'{home}','{muscle_gain,weight_loss}',NULL),
('uji','Uji (fermented porridge)','{"Uji","Uji wa wimbi"}','staples','1 cup',250,150,4.5,30.0,1.5,3.5,25,'{cheap,home,traditional}','{weight_loss,maintenance}','Skip the sugar.'),
('banana','Banana','{"Ndizi"}','fruits','1 medium',120,105,1.3,27.0,0.4,3.1,20,'{cheap,street}','{muscle_gain,maintenance}',NULL),
('mango','Mango','{"Maembe"}','fruits','1 medium',200,150,2.0,35.0,0.6,3.6,40,'{seasonal,street}','{weight_loss,maintenance}',NULL),
('pawpaw','Pawpaw','{"Papai"}','fruits','1 cup',150,60,0.7,15.0,0.4,2.5,30,'{cheap,home}','{weight_loss}',NULL),
('watermelon','Watermelon','{"Tikitimaji"}','fruits','1 cup',150,45,0.9,11.0,0.2,0.6,30,'{home}','{weight_loss}',NULL),
('orange','Orange','{"Chungwa"}','fruits','1 medium',130,62,1.2,15.0,0.2,3.1,15,'{cheap,street}','{weight_loss}',NULL),
('passion-juice','Passion juice (no sugar)','{"Juice ya passion"}','drinks','1 glass',250,80,1.0,19.0,0.3,1.0,50,'{home}','{maintenance}',NULL),
('chai-maziwa','Tea with milk & sugar','{"Chai"}','drinks','1 cup',250,120,3.5,16.0,4.5,0,25,'{home,kibanda}','{maintenance}','Two sugars a day adds up fast.'),
('black-tea','Black tea (no sugar)','{"Chai rangi"}','drinks','1 cup',250,5,0,1.0,0,0,10,'{cheap,home}','{weight_loss}',NULL),
('soda','Soda','{"Soda"}','drinks','300ml bottle',300,130,0,35.0,0,0,50,'{street}','{}','Liquid sugar - swap for water.'),
('water','Water','{"Maji"}','drinks','1 glass',250,0,0,0,0,0,0,'{cheap}','{weight_loss,muscle_gain,maintenance}',NULL);

-- ============ SEED: KENYAN MEAL TEMPLATES ============
INSERT INTO public.meals (slug,title,meal_type,description,components,calories,protein_g,carbs_g,fat_g,fiber_g,cost_ksh,prep_minutes,tags,good_for) VALUES
('uji-eggs','Uji + 2 boiled eggs','breakfast','Fermented porridge with eggs for staying-power protein.','[{"food":"uji","servings":1},{"food":"eggs","servings":1}]',305,17.5,31,12.1,3.5,65,15,'{cheap,home}','{weight_loss,muscle_gain}'),
('chai-mandazi-fruit','Chai, 1 mandazi + fruit','breakfast','A realistic Kenyan breakfast, portion-controlled.','[{"food":"chai-maziwa","servings":1},{"food":"mandazi","servings":1},{"food":"banana","servings":1}]',465,8.8,75,14.9,4.1,65,10,'{cheap,home}','{maintenance}'),
('sweet-potato-tea','Ngwaci + black tea + groundnuts','breakfast','Slow carbs, healthy fat, no sugar spike.','[{"food":"sweet-potato","servings":1},{"food":"black-tea","servings":1},{"food":"groundnuts","servings":1}]',305,9.3,35.8,14.7,7,65,15,'{cheap,home}','{weight_loss,maintenance}'),
('githeri-avocado','Githeri + avocado + kachumbari','lunch','Cheap complete-protein lunch with healthy fat.','[{"food":"githeri","servings":1},{"food":"sukuma-avocado","servings":1},{"food":"tomato-onion-salad","servings":1}]',480,18,62.5,17.9,19.2,90,25,'{cheap,home,kibanda}','{weight_loss,muscle_gain,maintenance}'),
('ugali-sukuma-omena','Ugali + sukuma wiki + omena','lunch','The classic budget muscle meal.','[{"food":"ugali","servings":1},{"food":"sukuma-wiki","servings":1},{"food":"omena","servings":1}]',482,34.1,58,12.5,5.4,90,30,'{cheap,home,traditional}','{muscle_gain,maintenance}'),
('rice-beans-greens','Rice + beans stew + greens','lunch','Kibanda staple that actually fits a plan.','[{"food":"rice-white","servings":1},{"food":"beans-stew","servings":1},{"food":"sukuma-wiki","servings":1}]',505,22.6,92,5.4,16,95,30,'{cheap,kibanda}','{muscle_gain,maintenance}'),
('chapati-ndengu','1 chapati + ndengu + kachumbari','lunch','One chapati, not three - the fix most people need.','[{"food":"chapati","servings":1},{"food":"ndengu","servings":1},{"food":"tomato-onion-salad","servings":1}]',542,21,88,10.8,16.5,85,35,'{home}','{maintenance,muscle_gain}'),
('brown-ugali-fish','Brown ugali + tilapia + managu','supper','High protein, high fibre, low sugar supper.','[{"food":"brown-ugali","servings":1},{"food":"tilapia","servings":1},{"food":"managu","servings":1}]',540,44.2,58,13.8,8.5,305,35,'{home}','{weight_loss,muscle_gain}'),
('matoke-beef','Matoke + beef stew + terere','supper','Comfort supper that still hits protein.','[{"food":"matoke","servings":1},{"food":"beef-stew","servings":1},{"food":"terere","servings":1}]',545,35.8,49.5,22.1,7.1,265,40,'{home}','{muscle_gain,maintenance}'),
('ugali-sukuma-chicken','Ugali + sukuma + grilled chicken','supper','Straightforward and filling.','[{"food":"ugali","servings":1},{"food":"sukuma-wiki","servings":1},{"food":"chicken-boiled","servings":1}]',532,41.1,55,16.5,5.4,240,35,'{home}','{muscle_gain}'),
('lentils-arrowroot','Nduma + lentils + spinach','supper','Meat-free supper, very high fibre.','[{"food":"arrowroot","servings":1},{"food":"lentils","servings":1},{"food":"spinach","servings":1}]',405,23.4,75,3,21.4,140,35,'{home,vegetarian}','{weight_loss}'),
('fruit-snack','Fruit + groundnuts','snack','Beats a smokie every time.','[{"food":"orange","servings":1},{"food":"groundnuts","servings":1}]',232,8.5,19.8,14.7,5.6,40,2,'{cheap,street}','{weight_loss,maintenance}'),
('mala-banana','Mala + banana','snack','Cheap post-workout recovery.','[{"food":"mala","servings":1},{"food":"banana","servings":1}]',245,9.3,39,7.4,3.1,80,2,'{cheap,home}','{muscle_gain}'),
('boiled-eggs-snack','2 boiled eggs','snack','Portable protein from any kiosk.','[{"food":"eggs","servings":1}]',155,13,1.1,10.6,0,40,10,'{cheap,street}','{weight_loss,muscle_gain}');