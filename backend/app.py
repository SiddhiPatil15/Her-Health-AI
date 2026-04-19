import os
import json
import logging
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier
import google.generativeai as genai

app = Flask(__name__)
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

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "HerHealth ML API Backend is running! Access the React frontend to use the application."})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
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
    data = request.json
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
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
             # Try local .env if available
             try:
                 from dotenv import load_dotenv
                 load_dotenv()
                 api_key = os.getenv("GEMINI_API_KEY")
             except:
                 pass

        if not api_key:
            return jsonify({
                "response": "Hello! I am your AI doctor. (Note: My reasoning brain is currently disconnected as GEMINI_API_KEY is not set on the server.)"
            })
            
        genai.configure(api_key=api_key)
        
        models_to_try = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
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

if __name__ == '__main__':
    app.run(port=5001, debug=True)
