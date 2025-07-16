import os
import numpy as np
import librosa
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
import tensorflow as tf
from pydub import AudioSegment
import subprocess

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Directory for uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Genre labels
genre_labels = ['blues', 'classical', 'country', 'disco', 'hiphop', 'jazz', 'metal', 'pop', 'reggae', 'rock']

# Load the pre-trained model
MODEL_PATH = "Trained_model.h5"
model = None

def load_model_lazy():
    global model
    if model is None:
        model = load_model(MODEL_PATH)
    return model

# Helper function to convert .webm to .wav using ffmpeg
def convert_webm_to_wav(file_path):
    wav_path = file_path.replace(".webm", ".wav")
    command = ['ffmpeg', '-i', file_path, wav_path]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error converting file: {e}")
        raise ValueError("Error during conversion")
    return wav_path

# Preprocessing function
def preprocess_audio(file_path, target_shape=(150, 150)):
    data = []
    try:
        audio_data, sample_rate = librosa.load(file_path, sr=None)
    except Exception as e:
        print(f"Error loading audio file: {e}")
        return None

    chunk_duration = 4  # seconds
    overlap_duration = 2  # seconds
    chunk_samples = chunk_duration * sample_rate
    overlap_samples = overlap_duration * sample_rate
    num_chunks = int(np.ceil((len(audio_data) - chunk_samples) / (chunk_samples - overlap_samples))) + 1

    for i in range(num_chunks):
        start = i * (chunk_samples - overlap_samples)
        end = start + chunk_samples
        chunk = audio_data[start:end]

        if len(chunk) < chunk_samples:
            break

        mel_spectrogram = librosa.feature.melspectrogram(y=chunk, sr=sample_rate)
        mel_spectrogram = tf.image.resize(np.expand_dims(mel_spectrogram, axis=-1), target_shape)  
        data.append(mel_spectrogram)

    return np.array(data)

# Prediction endpoint
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Save the uploaded file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # Convert .webm to .wav if necessary
    if file.filename.endswith(".webm"):
        file_path = convert_webm_to_wav(file_path)

    # Preprocess and predict
    processed_data = preprocess_audio(file_path)
    if processed_data is None or len(processed_data) == 0:
        # Remove uploaded file before returning error
        os.remove(file_path)
        return jsonify({"error": "Error processing audio file"}), 500

    model = load_model_lazy()
    y_pred = model.predict(processed_data)
    predicted_categories = np.argmax(y_pred, axis=1)
    unique_elements, counts = np.unique(predicted_categories, return_counts=True)
    max_count = np.max(counts)
    max_elements = unique_elements[counts == max_count]
    genre_prediction_index = max_elements[0]

    # Map to genre label
    predicted_genre = genre_labels[genre_prediction_index]
    
    # Confidence as the proportion of the most common prediction
    confidence_value = max_count / len(predicted_categories)

    # Clean up uploaded file and converted file (if any)
    os.remove(file_path)
    if file.filename.endswith(".webm"):
        wav_file_path = file_path.replace(".webm", ".wav")
        if os.path.exists(wav_file_path):
            os.remove(wav_file_path)

    return jsonify({
        'genre': predicted_genre,
        'confidence': float(confidence_value)
    })

if __name__ == "__main__":
    app.run(debug=True)
