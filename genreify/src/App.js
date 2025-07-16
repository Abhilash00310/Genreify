import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { parseBlob } from 'music-metadata-browser';
import './App.css';
import Slideshow from './Slideshow';

function App() {
    const [file, setFile] = useState(null);
    const [prediction, setPrediction] = useState("");
    const [confidence, setConfidence] = useState(null);
    const [error, setError] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState("00:00");
    const [currentTime, setCurrentTime] = useState("00:00");
    const [uploading, setUploading] = useState(false);
    const [nowPlaying, setNowPlaying] = useState({ artist: "Unknown Artist", track: "Unknown Track" });
    const [progress, setProgress] = useState(0);
    const audioElementRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        const audio = audioElementRef.current;
        if (audio) {
            audio.onloadedmetadata = () => {
                const minutes = Math.floor(audio.duration / 60);
                const seconds = Math.floor(audio.duration % 60);
                setDuration(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
            };
            audio.ontimeupdate = () => {
                const minutes = Math.floor(audio.currentTime / 60);
                const seconds = Math.floor(audio.currentTime % 60);
                setCurrentTime(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
                const progressPercent = (audio.currentTime / audio.duration) * 100;
                setProgress(progressPercent);
            };
        }
    }, [audioURL]);

    const handleFileChange = async (event) => {
        const newFile = event.target.files[0];
        if (newFile) {
            setFile(newFile);
            setAudioURL(URL.createObjectURL(newFile));
            setPrediction("");
            setConfidence(null);
            setError("");
            stopRecording();
            setIsPlaying(false);
    
            // Try to get metadata
            try {
                const metadata = await parseBlob(newFile);
                const artist = metadata.common.artist || "Unknown Artist";
                const track = metadata.common.title || newFile.name.split(".")[0];
                setNowPlaying({ artist, track });
            } catch (error) {
                console.error("Error reading metadata:", error);
    
                // Fallback to parsing file name if metadata not available
                const filename = newFile.name.split(".")[0];
                const hyphenIndex = filename.indexOf("-");
                if (hyphenIndex !== -1) {
                    const track = filename.substring(0, hyphenIndex).trim();
                    const artist = filename.substring(hyphenIndex + 1).trim();
                    setNowPlaying({ artist, track });
                } else {
                    setNowPlaying({ artist: "Unknown Artist", track: filename });
                }
            }
        }
    };
    

    const toggleRecording = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        setPrediction("");
        setConfidence(null);
        setFile(null);
        setAudioURL(null);
        setIsPlaying(false);
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);
                setFile(null);
                setIsPlaying(false);
            };
            mediaRecorderRef.current.start();
        } catch (err) {
            setError("Error accessing microphone. Please check permissions.");
            setIsRecording(false);
            console.error(err);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const togglePlayPause = () => {
        const audio = audioElementRef.current;
        if (audio) {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play().catch((err) => {
                    console.error("Play interrupted: ", err);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleFileUpload = async () => {
        const formData = new FormData();
        const blob = file ? file : await fetch(audioURL).then(res => res.blob());
        formData.append("file", blob, "audio.webm");

        setUploading(true);
        try {
            const response = await axios.post("http://127.0.0.1:5000/predict", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setPrediction(response.data.genre);
            setConfidence(response.data.confidence);
        } catch (err) {
            setError("Error during prediction. Please try again.");
            console.error(err);
        }
        setUploading(false);
    };

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const getConfidenceColor = () => {
        if (confidence >= 0.6) return 'green';
        if (confidence >= 0.4) return 'yellow';
        return 'red';
    };

    return (
        <div className="container">
            <div className="sidebar">
                <div className="logo">
                    <h1>Genreify</h1>
                </div>

                {/* Slideshow for genre facts */}
                <Slideshow />
                <h1>‎ </h1>

                {/* Progress bar for audio playback */}
                <div className="progress-bar-container" style={{ padding: '2px', backgroundColor: '#1c1c1c', marginTop: '20px', marginBottom: '0px' }}>
                    <progress value={progress} max="100" style={{ width: '100%', height: '15px' }}></progress>
                </div>

                <div className="now-playing" style={{ paddingLeft: '10px', marginBottom: '50px' }}>
                    <h3 style={{ color: 'ffffff' }}>Now Playing</h3>
                        <p style={{ fontSize: '18px', fontFamily: 'Circular Black, monospace', color:'#1ed760' }}>
                            {nowPlaying.artist} - {nowPlaying.track}
                        </p>
                </div>

            </div>
            <div className="main-content">
                <div className="album-art"></div>

                <div className="playback-controls" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <button onClick={togglePlayPause}>{isPlaying ? "⏸" : "▶"}</button>
                    <div className="duration-display" style={{ marginTop: '10px' }}>
                        {currentTime} / {duration}
                    </div>
                </div>

                <div className="controls" style={{ textAlign: 'center' }}>
                    <input type="file" onChange={handleFileChange} accept=".wav,.mp3,.webm" />
                    <button onClick={toggleRecording} style={{ margin: '10px' }}>
                        {isRecording ? "Stop Recording" : "Record"}
                    </button>
                    <button onClick={handleFileUpload} disabled={!audioURL && !file} style={{ margin: '10px' }}>
                        Predict Genre
                    </button>
                </div>

                {uploading && (
                    <div className="progress-bar-container">
                        <progress max="100" value={uploading ? 50 : 100}></progress>
                    </div>
                )}

                {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
                {prediction && (
                    <p className="prediction" style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'Circular Black, monospace', fontSize: '20px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'Circular Black, monospace', fontSize: '20px' }}>
                        Predicted Genre:
                    </span> {prediction}<br />
                    <span style={{ fontWeight: 'bold', fontFamily: 'Circular Black, monospace', fontSize: '20px', color: getConfidenceColor() }}>
                        Confidence: {(confidence * 100).toFixed(2)}%
                    </span>
                    </p>
                )}
            </div>
        </div>
    );
}

export default App;
