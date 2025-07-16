import React, { useState, useEffect } from 'react';

const genreFacts = [
    "Rock: Known for its strong beat, simple melodies, and amplified instruments. Popular since the 1950s.",
    "Pop: Often features catchy melodies, repetitive structures, and mass appeal. Popular worldwide.",
    "Jazz: A genre with complex rhythms, improvisation, and varied forms, rooted in African-American culture.",
    "Classical: Music that follows strict forms and has a wide range of orchestral compositions.",
    "Hip-hop: A genre with strong rhythms, rapping vocals, and urban culture influences.",
    "Electronic: Music produced using electronic devices and synthesizers, often with a repetitive beat.",
    "Reggae: Known for its offbeat rhythm, it originated in Jamaica and addresses social and political issues.",
    "Blues: Characterized by its melancholic tone, it's the foundation of many modern music genres.",
    "Country: Rooted in American folk music with storytelling lyrics, often featuring guitars and banjos.",
    "R&B: Rhythm and blues, featuring soulful melodies and influences from jazz, gospel, and pop."
];

const Slideshow = () => {
    const [currentFactIndex, setCurrentFactIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentFactIndex((prevIndex) => (prevIndex + 1) % genreFacts.length);
                setIsVisible(true);
            }, 500); // Add a short delay to make the fade effect noticeable
        }, 5000); // Change the fact every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="slideshow-container" style={{ padding: '0px' }}>
            <div
                className={`slideshow-fact ${isVisible ? 'fade-in' : 'fade-out'}`}
                style={{
                    transition: 'opacity 0.5s ease-in-out',
                    opacity: isVisible ? 1 : 0,
                    fontSize: '20px',
                    textAlign: 'start',
                    fontFamily: 'Circular Black, monospace',
                    color: '#ffffff'
                }}
            >
                {genreFacts[currentFactIndex]}
            </div>
        </div>
    );
};

export default Slideshow;
