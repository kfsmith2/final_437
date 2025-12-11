import time
import json
import paho.mqtt.client as mqtt
from supabase import create_client, Client

# --- CONFIG ---
MQTT_BROKER = "localhost"
MQTT_TOPIC = "posture/project/data"

# PASTE YOUR SUPABASE KEYS HERE
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-public-anon-key"

# Init Cloud Connection
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Rate Limiting (Upload once every 5 seconds to save data)
last_upload = 0
UPLOAD_INTERVAL = 5

def on_connect(client, userdata, flags, rc):
    print("Logger connected to MQTT")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    global last_upload
    now = time.time()
   
    # Only upload if interval has passed
    if (now - last_upload) > UPLOAD_INTERVAL:
        try:
            # 1. Parse Data from MQTT
            payload = json.loads(msg.payload.decode())
           
            # 2. Prepare for Cloud
            data = {
                "pitch": payload.get("pitch"),
                "is_slouching": abs(payload.get("pitch")) > payload.get("threshold"),
                "session_id": "pi_v1" # Useful if you have multiple devices later
            }
           
            # 3. Upload to Supabase
            supabase.table('posture_history').insert(data).execute()
            print(f"Uploaded to Cloud: {data['pitch']}°")
            last_upload = now
           
        except Exception as e:
            print(f"Upload Error: {e}")

# Run Forever
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_BROKER, 1883, 60)
print("Cloud Logger Service Started...")
client.loop_forever()


# URL: 
# https://fyjsbjtwyotquipagvea.supabase.co

# KEY: 
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5anNianR3eW90cXVpcGFndmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Nzc3NDYsImV4cCI6MjA4MTA1Mzc0Nn0.SsUL6Ig-j4G31jDGz1OwSifWwq3_1I4RuhO_IgKNWq8