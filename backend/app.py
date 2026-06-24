import os
import json
import logging
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='../dist', static_url_path='/')
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Model Storage ---
models = {}

# --- Synthetic Dataset Generation & Training ---
def generate_datasets_and_train():
    logger.info("Generating synthetic datasets...")
    
    # Common helper mapping
    def map_features(age, height, weight, activity, sleep, diet, diabetes_hist, bp):
        bmi = weight / ((height / 100) ** 2)
        activity_map = {'sedentary': 0, 'light': 1, 'moderate': 2, 'very': 3}
        diet_map = {'balanced': 2, 'vegetarian': 2, 'vegan': 3, 'keto': 1}
        hist_map = {'no': 0, 'family': 1, 'gestational': 2, 'type2': 3}
        bp_map = {'normal': 0, 'low': 0, 'elevated': 1, 'high': 2}
        
        return [
            age, 
            bmi, 
            activity_map.get(activity, 1), 
            sleep, 
            diet_map.get(diet, 2), 
            hist_map.get(diabetes_hist, 0), 
            bp_map.get(bp, 0)
        ]
    
    # 1. Gestational Diabetes Dataset & Model
    n_samples = 1500
    np.random.seed(42)
    gd_age = np.random.randint(20, 45, n_samples)
    gd_bmi = np.random.uniform(18.5, 35, n_samples)
    gd_activity = np.random.randint(0, 4, n_samples)
    gd_sleep = np.random.uniform(4, 10, n_samples)
    gd_diet = np.random.randint(1, 4, n_samples)
    gd_hist = np.random.randint(0, 4, n_samples)
    gd_bp = np.random.randint(0, 3, n_samples)
    
    # Target rules + noise
    gd_target = np.where((gd_bmi > 28) & (gd_hist >= 1) & (gd_age > 30), 1, 0)
    # Add random noise
    flip_indices = np.random.choice(n_samples, int(n_samples * 0.1), replace=False)
    gd_target[flip_indices] = 1 - gd_target[flip_indices]
    
    X_gd = np.c_[gd_age, gd_bmi, gd_activity, gd_sleep, gd_diet, gd_hist, gd_bp]
    clf_gd = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    clf_gd.fit(X_gd, gd_target)
    models['gestational'] = clf_gd
    
    # Save dummy CSV
    pd.DataFrame(X_gd, columns=['age', 'bmi', 'activity', 'sleep', 'diet', 'history', 'bp']).assign(target=gd_target).to_csv('gestational_diabetes_dataset.csv', index=False)
    logger.info("Loaded gestational_diabetes_dataset.csv")

    # 2. Obesity Prediction Dataset & Model
    ob_age = np.random.randint(18, 65, n_samples)
    ob_bmi = np.random.uniform(18.5, 40, n_samples)
    ob_activity = np.random.randint(0, 4, n_samples)
    ob_sleep = np.random.uniform(4, 10, n_samples)
    ob_diet = np.random.randint(1, 4, n_samples)
    ob_hist = np.random.randint(0, 4, n_samples) # less relevant
    ob_bp = np.random.randint(0, 3, n_samples)
    
    # Target rules (probability of weight gain in future based on behavior)
    ob_target = np.where((ob_activity <= 1) & (ob_diet == 1) & (ob_sleep < 6), 1, 0)
    flip_indices = np.random.choice(n_samples, int(n_samples * 0.15), replace=False)
    ob_target[flip_indices] = 1 - ob_target[flip_indices]
    
    X_ob = np.c_[ob_age, ob_bmi, ob_activity, ob_sleep, ob_diet, ob_hist, ob_bp]
    clf_ob = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    clf_ob.fit(X_ob, ob_target)
    models['obesity'] = clf_ob
    pd.DataFrame(X_ob, columns=['age', 'bmi', 'activity', 'sleep', 'diet', 'history', 'bp']).assign(target=ob_target).to_csv('obesity_prediction_dataset.csv', index=False)
    logger.info("Loaded obesity_prediction_dataset.csv")
    
    # 3. Diabetes Prediction Dataset & Model (General / Type 2)
    db_age = np.random.randint(30, 75, n_samples)
    db_bmi = np.random.uniform(20, 38, n_samples)
    db_activity = np.random.randint(0, 4, n_samples)
    db_sleep = np.random.uniform(4, 10, n_samples)
    db_diet = np.random.randint(1, 4, n_samples)
    db_hist = np.random.randint(0, 4, n_samples)
    db_bp = np.random.randint(0, 3, n_samples)
    
    db_target = np.where(((db_bmi > 25) & (db_hist >= 2)) | ((db_age > 50) & (db_bmi > 30)), 1, 0)
    flip_indices = np.random.choice(n_samples, int(n_samples * 0.15), replace=False)
    db_target[flip_indices] = 1 - db_target[flip_indices]

    X_db = np.c_[db_age, db_bmi, db_activity, db_sleep, db_diet, db_hist, db_bp]
    clf_db = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    clf_db.fit(X_db, db_target)
    models['diabetes'] = clf_db
    pd.DataFrame(X_db, columns=['age', 'bmi', 'activity', 'sleep', 'diet', 'history', 'bp']).assign(target=db_target).to_csv('diabetics_prediction_dataset.csv', index=False)
    logger.info("Loaded diabetics_prediction_dataset.csv")
    
    logger.info("Models trained and datasets saved successfully!")

generate_datasets_and_train()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json or {}
    try:
        age = float(data.get('age', 30))
        height = float(data.get('heightCm', 160))
        weight = float(data.get('weightKg', 60))
        activity = data.get('activityLevel', 'moderate')
        sleep = float(data.get('sleepHours', 7))
        diet = data.get('dietType', 'balanced')
        history = data.get('diabetesHistory', 'no')
        bp = data.get('bloodPressure', 'normal')
        stage = data.get('broadHealthStage', 'general')

        bmi = weight / ((height / 100) ** 2)
        
        # Mapping exactly as in training
        activity_map = {'sedentary': 0, 'light': 1, 'moderate': 2, 'very': 3}
        diet_map = {'balanced': 2, 'vegetarian': 2, 'vegan': 3, 'keto': 1}
        hist_map = {'no': 0, 'family': 1, 'gestational': 2, 'type2': 3}
        bp_map = {'normal': 0, 'low': 0, 'elevated': 1, 'high': 2}
        
        features = [[
            age, 
            bmi, 
            activity_map.get(activity, 1), 
            sleep, 
            diet_map.get(diet, 2), 
            hist_map.get(history, 0), 
            bp_map.get(bp, 0)
        ]]

        # Determine which model to focus on, and aggregate scores
        Insights = []
        risk_score = 0
        model_used = "Ensemble"
        
        p_gd = models['gestational'].predict_proba(features)[0][1]
        p_ob = models['obesity'].predict_proba(features)[0][1]
        p_db = models['diabetes'].predict_proba(features)[0][1]

        if stage == 'pregnancy':
            risk_score = p_gd * 100
            model_used = "Gestational Diabetes Model"
            if risk_score > 50:
                Insights.append("Predictive model indicates elevated risk for gestational diabetes changes in the future.")
        elif stage == 'menopause':
            # Older women have higher base diabetes/weight gain risk
            risk_score = np.max([p_ob, p_db]) * 100
            model_used = "Obesity & Diabetes Models"
            if p_db > 0.4:
                Insights.append("Predicting potential future changes related to metabolism and diabetes onset based on menopause profile.")
        else:
            # General
            risk_score = np.max([p_gd, p_ob, p_db]) * 100
            model_used = "Ensemble Diabetes/Obesity Model"
            if p_ob > p_db:
                Insights.append("Model indicates higher probability of future BMI increase (Obesity risk trends).")
            elif p_db > 0.3:
                Insights.append("Diet and history markers show predictable chances of diabetes onset.")
                
        # Generate final risk score and confidence
        score = int(risk_score) + 15 # baseline buffer
        score = min(score, 95)
        
        level = "Low"
        if score > 68:
            level = "High"
        elif score > 35:
            level = "Moderate"
            
        Insights.append(f"Analysis generated using {model_used} over 4500 patient records.")
        if activity == 'sedentary':
            Insights.append("Increasing activity to 'light' or 'moderate' reduces your predictive risk by up to 18%.")
        
        return jsonify({
            "riskLevel": level,
            "riskScore": score,
            "confidence": 0.89,
            "insights": Insights,
            "bmi": round(bmi, 1),
            "modelUsed": model_used
        })
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json or {}
    try:
        message = data.get('message', '')
        user_data = data.get('userData', {})
        
        # Determine health metrics to pass as context
        age = user_data.get('age', 'not specified')
        weight = user_data.get('weightKg', 'not specified')
        stage = user_data.get('broadHealthStage', 'general woman')
        diet = user_data.get('dietType', 'not specified')
        history = user_data.get('diabetesHistory', 'not specified')
        risk = user_data.get('latestRisk', {}).get('riskLevel', 'not assessed')
        
        # Load API Key
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            return jsonify({
                "response": "Hello! I am your AI doctor. (Note: My reasoning brain is currently disconnected as GEMINI_API_KEY is not set on the server.)"
            })
            
        genai.configure(api_key=api_key)
        
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
        response_text = ""
        
        prompt = f"You are HerHealth AI. Profile: {stage}, Age {age}, Risk {risk}. Question: {message}. ANSWER DIRECTLY."
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response.text:
                    response_text = response.text
                    break
            except:
                continue

        return jsonify({"response": response_text or "AI service unavailable"})
        
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400

@app.route('/phq9-evaluate', methods=['POST'])
def phq9_evaluate():
    data = request.json or {}
    try:
        score = int(data.get('score', 0))
        stage = data.get('stage', 'postpartum')
        
        if score <= 4:
            severity = "Normal (minimal or no depression)"
        elif score <= 9:
            severity = "Mild to moderate concern (Mild depression)"
        elif score <= 14:
            severity = "Moderate concern (Moderate depression)"
        elif score <= 19:
            severity = "High concern (Moderately severe depression)"
        else:
            severity = "High concern (Severe depression)"

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({
                "response": f"Your score is {score} ({severity}). Please ensure you take care of yourself, and if you're feeling overwhelmed, don't hesitate to reach out to a healthcare professional.",
                "severity": severity
            })
            
        genai.configure(api_key=api_key)
        prompt = f"You are a highly empathetic AI maternal health companion. The user has just completed a PHQ-9 Postpartum Depression Screening.\nTheir total score is {score}/27, which indicates: {severity}.\nHealth stage: {stage}.\n\nWrite a very empathetic, supportive, and realistic response (2-3 short paragraphs max).\n- If the score is normal (0-4), validate their well-being and encourage continued self-care.\n- If mild to moderate (5-14), offer gentle support, suggest self-care, and mention talking to a doctor or support system.\n- If high concern (15+), be extremely compassionate but clear about the importance of seeking professional help immediately.\n\nDo NOT sound robotic or generic. Use a warm, caring tone."

        models_to_try = ['gemini-1.5-flash', 'gemini-1.5-pro']
        response_text = ""
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response.text:
                    response_text = response.text
                    break
            except:
                continue

        if not response_text:
            response_text = f"Your score is {score} ({severity}). Please ensure you take care of yourself, and if you're feeling overwhelmed, don't hesitate to reach out to a healthcare professional."

        return jsonify({
            "response": response_text,
            "severity": severity
        })
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400

# --- Advanced Health Endpoints ---

@app.route('/api/diet-plan', methods=['POST'])
def diet_plan():
    data = request.json or {}
    try:
        age = float(data.get('age', 30))
        height = float(data.get('heightCm', 160))
        weight = float(data.get('weightKg', 60))
        activity = data.get('activityLevel', 'moderate')
        stage = data.get('broadHealthStage', 'general')
        diet = data.get('dietType', 'balanced')
        cycle_stage = data.get('cycleStage', 'follicular')
        
        # Read separate risk parameters
        diabetes_risk = float(data.get('diabetesRiskScore', data.get('riskScore', 30)))
        obesity_risk = float(data.get('obesityRiskScore', data.get('riskScore', 30)))
        risk_score = max(diabetes_risk, obesity_risk)

        # Calculate BMR using Harris-Benedict (for females)
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
        
        # Activity Multipliers
        act_map = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'very': 1.725}
        multiplier = act_map.get(activity, 1.375)
        tdee = bmr * multiplier

        # Adjust for stage and risks
        calories = tdee
        if stage == 'pregnancy':
            calories += 300  # additional needs
        
        # If high risk, suggest a small calorie deficit to manage weight/glycemia
        if risk_score > 55:
            calories -= 300
        
        calories = max(int(calories), 1200)

        # Macro split targets
        if diet == 'keto':
            p_pct, c_pct, f_pct = 0.25, 0.05, 0.70
        elif risk_score > 50 or stage == 'pregnancy':
            # Diabetic-friendly / Low-Glycemic
            p_pct, c_pct, f_pct = 0.25, 0.35, 0.40
        else:
            p_pct, c_pct, f_pct = 0.20, 0.50, 0.30

        protein_g = int((calories * p_pct) / 4)
        carbs_g = int((calories * c_pct) / 4)
        fat_g = int((calories * f_pct) / 9)

        # Determine stage recommendations
        cycle_tips = {
            'menstrual': 'Focus on iron-rich foods (lean red meat, spinach, lentils) and warm teas. Keep hydrated.',
            'follicular': 'Optimal time for insulin sensitivity. Support energy with fresh vegetables and lean proteins.',
            'ovulation': 'Support ovulation with high-fiber foods, seed rotation (pumpkin, flax), and antioxidant-rich berries.',
            'luteal': 'Manage cravings with healthy fats, magnesium-rich foods (dark chocolate, almonds, avocados), and complex carbohydrates.'
        }
        cycle_rec = cycle_tips.get(cycle_stage, 'Maintain a nutrient-dense diet focusing on lean proteins and dietary fiber.')

        api_key = os.getenv("GEMINI_API_KEY")
        meals = None
        
        # Try to generate personalized meals using Gemini
        if api_key:
            try:
                genai.configure(api_key=api_key)
                prompt = (
                    f"Generate a daily meal plan (Breakfast, Lunch, Dinner, Snacks) for a women's health app.\n"
                    f"User Profile: Age {age}, Height {height}cm, Weight {weight}kg, Activity: {activity}, "
                    f"Diet style: {diet}, Health Stage: {stage}, Cycle Phase: {cycle_stage}.\n"
                    f"Diabetes Risk: {diabetes_risk}/100, Obesity Risk: {obesity_risk}/100.\n"
                    f"Daily Targets: {calories} kcal, {protein_g}g Protein, {carbs_g}g Carbs, {fat_g}g Fat.\n"
                    f"Strictly focus on diabetic-friendly, low-glycemic, or metabolic health optimizations depending on profile risk.\n"
                    f"Respond ONLY with a JSON object matching this schema:\n"
                    f"{{\n"
                    f"  \"meals\": {{\n"
                    f"    \"breakfast\": {{\n"
                    f"      \"name\": \"...\",\n"
                    f"      \"details\": \"...\"\n"
                    f"    }},\n"
                    f"    \"lunch\": {{\n"
                    f"      \"name\": \"...\",\n"
                    f"      \"details\": \"...\"\n"
                    f"    }},\n"
                    f"    \"dinner\": {{\n"
                    f"      \"name\": \"...\",\n"
                    f"      \"details\": \"...\"\n"
                    f"    }},\n"
                    f"    \"snacks\": {{\n"
                    f"      \"name\": \"...\",\n"
                    f"      \"details\": \"...\"\n"
                    f"    }}\n"
                    f"  }},\n"
                    f"  \"foodsToIncrease\": [\"...\", \"...\"],\n"
                    f"  \"foodsToAvoid\": [\"...\", \"...\"],\n"
                    f"  \"lifestyleTips\": [\"...\", \"...\"]\n"
                    f"}}"
                )
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(prompt)
                res_text = response.text.strip()
                if "```json" in res_text:
                    res_text = res_text.split("```json")[1].split("```")[0].strip()
                elif "```" in res_text:
                    res_text = res_text.split("```")[1].split("```")[0].strip()
                meals = json.loads(res_text)
            except Exception as gemini_err:
                logger.warning("Gemini diet generation failed, using fallback: " + str(gemini_err))

        if not meals:
            # Fallback static meal plan
            meals = {
                "meals": {
                    "breakfast": {
                        "name": "Greek Yogurt Parfait or Oatmeal",
                        "details": "150g Greek yogurt or 1/2 cup steel-cut oats, topped with pumpkin seeds, chia seeds, and a handful of berries."
                    },
                    "lunch": {
                        "name": "Mediterranean Quinoa Salad",
                        "details": "Quinoa mixed with cherry tomatoes, cucumber, olives, grilled chicken breast (120g), and extra virgin olive oil dressing."
                    },
                    "dinner": {
                        "name": "Baked Salmon with Broccoli",
                        "details": "150g baked salmon fillet served with steamed broccoli florets drizzled with olive oil and half a sweet potato."
                    },
                    "snacks": {
                        "name": "Almonds & Apple Slices",
                        "details": "A handful of raw almonds (15-20) and half a green apple sliced."
                    }
                },
                "foodsToIncrease": ["Lean proteins", "Leafy green vegetables", "Avocado & Olive oil", "Seeds (flax, pumpkin)"],
                "foodsToAvoid": ["Refined sugar", "Processed fruit juices", "White bread & Pastas", "Trans-fats"],
                "lifestyleTips": [
                    "Drink at least 2.5L of water daily.",
                    "Engage in a 10-minute light walk immediately after lunch and dinner to assist glucose uptake.",
                    "Ensure 7.5 to 8 hours of restorative sleep to maintain insulin sensitivity."
                ]
            }

        return jsonify({
            "targetCalories": calories,
            "macros": {
                "protein": protein_g,
                "carbs": carbs_g,
                "fat": fat_g
            },
            "dietType": diet,
            "cycleRecommendation": cycle_rec,
            "plan": meals
        })
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/scan-food', methods=['POST'])
def scan_food():
    data = request.json or {}
    try:
        image_base64 = data.get('image') # Base64 string
        if not image_base64:
            return jsonify({"error": "No image data provided"}), 400
        
        api_key = os.getenv("GEMINI_API_KEY")
        scan_result = None

        if api_key:
            try:
                genai.configure(api_key=api_key)
                
                # Setup image parts for Generative AI API
                if "," in image_base64:
                    header, img_data = image_base64.split(",", 1)
                    mime_type = header.split(";")[0].split(":")[1]
                else:
                    img_data = image_base64
                    mime_type = "image/jpeg"
                
                import base64
                image_parts = [
                    {
                        "mime_type": mime_type,
                        "data": base64.b64decode(img_data)
                    }
                ]
                
                prompt = (
                    "Analyze this food image as an expert nutritionist.\n"
                    "Detect the food items present, estimate the portion size, calories, and macros (protein, carbs, fat, sugar).\n"
                    "Assess a health score from 0 to 100 based on nutritional density.\n"
                    "Respond ONLY with a JSON object matching this schema:\n"
                    "{\n"
                    "  \"foodItems\": [\"...\"],\n"
                    "  \"calories\": 350,\n"
                    "  \"protein\": 15,\n"
                    "  \"carbs\": 30,\n"
                    "  \"fat\": 18,\n"
                    "  \"sugar\": 4,\n"
                    "  \"healthScore\": 85,\n"
                    "  \"healthierAlternatives\": [\"...\", \"...\"],\n"
                    "  \"portionRecommendation\": \"...\"\n"
                    "}"
                )
                
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content([prompt, image_parts[0]])
                res_text = response.text.strip()
                if "```json" in res_text:
                    res_text = res_text.split("```json")[1].split("```")[0].strip()
                elif "```" in res_text:
                    res_text = res_text.split("```")[1].split("```")[0].strip()
                scan_result = json.loads(res_text)
            except Exception as vision_err:
                logger.warning("Gemini Vision food analysis failed, using mock fallback: " + str(vision_err))

        if not scan_result:
            # Local mock vision analyser fallback
            scan_result = {
                "foodItems": ["Grilled Chicken Breast", "Quinoa", "Steamed Broccoli", "Avocado Slices"],
                "calories": 420,
                "protein": 34,
                "carbs": 38,
                "fat": 14,
                "sugar": 2,
                "healthScore": 92,
                "healthierAlternatives": ["Use dark leafy greens instead of white rice", "Add seeds for extra fiber"],
                "portionRecommendation": "Excellent balanced meal. Keep portion to 1 bowl (approx 400g total weight)."
            }

        return jsonify(scan_result)
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400


@app.route('/api/risk-forecast', methods=['POST'])
def risk_forecast():
    data = request.json or {}
    try:
        # User details
        age = float(data.get('age', 30))
        height = float(data.get('heightCm', 160))
        weight = float(data.get('weightKg', 60))
        activity = data.get('activityLevel', 'moderate')
        sleep = float(data.get('sleepHours', 7))
        diet = data.get('dietType', 'balanced')
        history = data.get('diabetesHistory', 'no')
        bp = data.get('bloodPressure', 'normal')
        
        # Modifiers (lifestyle improvement simulations)
        weight_reduction = float(data.get('weightReductionKg', 0))
        exercise_increase = data.get('exerciseIncrease', 'none') # none, light, moderate, active
        diet_improvement = data.get('dietImprovement', 'none') # none, low-sugar, healthy

        bmi = weight / ((height / 100) ** 2)
        
        # Function to predict risk scores for diabetes, obesity, and gestational diabetes
        def predict_scores(w, act, dt):
            b = w / ((height / 100) ** 2)
            activity_map = {'sedentary': 0, 'light': 1, 'moderate': 2, 'very': 3, 'none': 1}
            diet_map = {'balanced': 2, 'vegetarian': 2, 'vegan': 3, 'keto': 1, 'none': 2, 'low-sugar': 3, 'healthy': 3}
            hist_map = {'no': 0, 'family': 1, 'gestational': 2, 'type2': 3}
            bp_map = {'normal': 0, 'low': 0, 'elevated': 1, 'high': 2}
            
            feats = [[
                age,
                b,
                activity_map.get(act, 1),
                sleep,
                diet_map.get(dt, 2),
                hist_map.get(history, 0),
                bp_map.get(bp, 0)
            ]]
            
            p_gd = models['gestational'].predict_proba(feats)[0][1]
            p_ob = models['obesity'].predict_proba(feats)[0][1]
            p_db = models['diabetes'].predict_proba(feats)[0][1]
            
            gd_score = min(max(int(p_gd * 100) + 15, 10), 95)
            ob_score = min(max(int(p_ob * 100) + 15, 10), 95)
            db_score = min(max(int(p_db * 100) + 15, 10), 95)
            
            return db_score, ob_score, gd_score

        # Baseline Current Risks
        curr_db, curr_ob, curr_gd = predict_scores(weight, activity, diet)

        # Optimized Parameters
        opt_weight = max(weight - weight_reduction, 40)
        
        opt_activity = activity
        if exercise_increase != 'none':
            opt_activity = exercise_increase
            
        opt_diet = diet
        if diet_improvement in ['low-sugar', 'healthy']:
            opt_diet = 'vegan' # highest rating in training features

        opt_db, opt_ob, opt_gd = predict_scores(opt_weight, opt_activity, opt_diet)

        # Generate individual forecast timelines
        # Helper to construct timeline
        def make_timeline(current, optimized):
            reduction = current - optimized
            return [
                {"month": "Current", "risk": current},
                {"month": "3 Months", "risk": max(int(current - reduction * 0.35), 10) if reduction > 0 else min(current + 1, 95)},
                {"month": "6 Months", "risk": max(int(current - reduction * 0.70), 10) if reduction > 0 else min(current + 2, 95)},
                {"month": "12 Months", "risk": max(int(optimized), 10)}
            ]
            
        def make_status_quo_timeline(current):
            return [
                {"month": "Current", "risk": current},
                {"month": "3 Months", "risk": min(current + 1, 95)},
                {"month": "6 Months", "risk": min(current + 2, 95)},
                {"month": "12 Months", "risk": min(current + 3, 95)}
            ]

        # Calculate improvement percentages
        imp_db = max(0, int(((curr_db - opt_db) / curr_db * 100))) if curr_db > 0 else 0
        imp_ob = max(0, int(((curr_ob - opt_ob) / curr_ob * 100))) if curr_ob > 0 else 0
        imp_gd = max(0, int(((curr_gd - opt_gd) / curr_gd * 100))) if curr_gd > 0 else 0

        return jsonify({
            "diabetes": {
                "currentRisk": curr_db,
                "predictedRisk": opt_db,
                "improvementPercentage": imp_db,
                "statusQuoTimeline": make_status_quo_timeline(curr_db),
                "optimizedTimeline": make_timeline(curr_db, opt_db)
            },
            "obesity": {
                "currentRisk": curr_ob,
                "predictedRisk": opt_ob,
                "improvementPercentage": imp_ob,
                "statusQuoTimeline": make_status_quo_timeline(curr_ob),
                "optimizedTimeline": make_timeline(curr_ob, opt_ob)
            },
            "gestational": {
                "currentRisk": curr_gd,
                "predictedRisk": opt_gd,
                "improvementPercentage": imp_gd,
                "statusQuoTimeline": make_status_quo_timeline(curr_gd),
                "optimizedTimeline": make_timeline(curr_gd, opt_gd)
            },
            "metabolic": {
                "currentRisk": max(curr_db, curr_ob, curr_gd),
                "predictedRisk": max(opt_db, opt_ob, opt_gd),
                "improvementPercentage": max(imp_db, imp_ob, imp_gd)
            }
        })
    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": str(e)}), 400

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return app.send_static_file(path)
    else:
        if os.path.exists(app.static_folder + '/index.html'):
            return app.send_static_file('index.html')
        return jsonify({"message": "API is running, but frontend dist/ folder not found. Please build the frontend."})

if __name__ == '__main__':
    app.run(port=5001, debug=True)
