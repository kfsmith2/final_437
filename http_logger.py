import time
import json
import requests  # <--- Use standard HTTP requests
import paho.mqtt.client as mqtt


# --- CONFIG ---
MQTT_BROKER = "localhost"
MQTT_TOPIC = "posture/project/data"

# SUPABASE CONFIG
SUPABASE_URL = "https://fyjsbjtwyotquipagvea.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5anNianR3eW90cXVpcGFndmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Nzc3NDYsImV4cCI6MjA4MTA1Mzc0Nn0.SsUL6Ig-j4G31jDGz1OwSifWwq3_1I4RuhO_IgKNWq8"

# Headers to make us look like a normal web browser
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Rate Limiting
last_upload = 0
UPLOAD_INTERVAL = 5

def on_connect(client, userdata, flags, rc):
    print("Logger connected to MQTT")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    global last_upload
    now = time.time()
   
    if (now - last_upload) > UPLOAD_INTERVAL:
        try:
            # 1. Parse MQTT
            payload = json.loads(msg.payload.decode())
           
            # 2. Prepare Data
            data = {
                "pitch": payload.get("pitch"),
                "is_slouching": abs(payload.get("pitch")) > payload.get("threshold"),
                "session_id": "pi_v1"
            }
           
            # 3. Upload using DIRECT HTTP (Bypasses library issues)
            endpoint = f"{SUPABASE_URL}/rest/v1/posture_history"
            response = requests.post(endpoint, headers=HEADERS, json=data)
           
            if response.status_code == 201:
                print(f"Uploaded: {data['pitch']}°")
                last_upload = now
            else:
                print(f"Error {response.status_code}: {response.text}")

        except Exception as e:
            print(f"Upload Error: {e}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_BROKER, 1883, 60)
print("Cloud Logger (HTTP Mode) Started...")
client.loop_forever()
