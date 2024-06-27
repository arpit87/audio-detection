import React, { useEffect, useRef, useState } from 'react';

const App = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationCountdown, setCalibrationCountdown] = useState(3);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const calibrationDataRef = useRef([]);
  const isCalibratingRef = useRef(false); // Ref to store the isCalibrating state
  const ambientNoiseLevelRef = useRef(0); // Ref to store the ambientNoiseLevel

  const initAudio = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      await audioContextRef.current.audioWorklet.addModule('volume-processor.js');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      audioWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'volume-processor');

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioWorkletNodeRef.current);
      audioWorkletNodeRef.current.connect(audioContextRef.current.destination);

      audioWorkletNodeRef.current.port.onmessage = (event) => {
        const { average } = event.data;
        
        if (isCalibratingRef.current) {
          console.log('Calibrating: ', average);
          calibrationDataRef.current.push(average);
        } else {
          if (average > ambientNoiseLevelRef.current * 25) { // Adjust the multiplier as needed
          console.log('Received average:', average,"ambientNoiseLevelRef.current:",ambientNoiseLevelRef.current);
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
            if (!isSpeaking) {
              setIsSpeaking(true);
            }
          } else {
            if (!silenceTimeoutRef.current) {
              silenceTimeoutRef.current = setTimeout(() => {
                setIsSpeaking(false);
              }, 800); // Adjust the timeout duration as needed
            }
          }
        }
      };

      setIsAudioInitialized(true);
      startCalibration();
    } catch (err) {
      console.error('Error accessing microphone', err);
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    isCalibratingRef.current = true; // Update the ref
    let countdown = 3;
    const interval = setInterval(() => {
      setCalibrationCountdown(countdown);
      countdown -= 1;
      if (countdown < 0) {
        clearInterval(interval);
        finishCalibration();
      }
    }, 1000);
  };

  // const finishCalibration = () => {
  //   setIsCalibrating(false);
  //   isCalibratingRef.current = false; // Update the ref
  //   if (calibrationDataRef.current.length > 0) {
  //     const averageNoiseLevel = calibrationDataRef.current.reduce((a, b) => a + b, 0) / calibrationDataRef.current.length;
  //     ambientNoiseLevelRef.current = averageNoiseLevel; // Update the ref
  //     console.log('Calibration complete. Ambient noise level: ', averageNoiseLevel);
  //   } else {
  //     console.error('Calibration data is empty. Unable to determine ambient noise level.');
  //   }
  // };

  const finishCalibration = () => {
    setIsCalibrating(false);
    isCalibratingRef.current = false; // Update the ref
    if (calibrationDataRef.current.length > 0) {
      // Calculate the mean
      const mean = calibrationDataRef.current.reduce((a, b) => a + b, 0) / calibrationDataRef.current.length;
  
      // Calculate the variance
      const variance = calibrationDataRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / calibrationDataRef.current.length;
  
      // Calculate the standard deviation
      const stdDev = Math.sqrt(variance);
  
      // Filter out the outliers
      const filteredData = calibrationDataRef.current.filter(value => Math.abs(value - mean) <= stdDev);
  
      // Calculate the average of the filtered data
      const averageNoiseLevel = filteredData.reduce((a, b) => a + b, 0) / filteredData.length;
  
      ambientNoiseLevelRef.current = averageNoiseLevel; // Update the ref
      console.log('Calibration complete. Ambient noise level (average after removing outliers): ', averageNoiseLevel);
    } else {
      console.error('Calibration data is empty. Unable to determine ambient noise level.');
    }
  };

  const handleStart = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    } else {
      initAudio();
    }
  };

  const handleStop = () => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setIsAudioInitialized(false);
    setIsSpeaking(false);
    setIsCalibrating(false);
    setCalibrationCountdown(3);
    calibrationDataRef.current = [];
    isCalibratingRef.current = false; // Reset the ref
    ambientNoiseLevelRef.current = 0; // Reset the ref
  };

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  return (
    <div>
      <h1>Audio Detection</h1>
      {!isAudioInitialized ? (
        <button onClick={handleStart}>Start Recording</button>
      ) : (
        <>
          {isCalibrating ? (
            <p>Calibrating... {calibrationCountdown}</p>
          ) : (
            <>
              <p>{isSpeaking ? 'User is speaking...' : 'User has stopped speaking.'}</p>
              <button onClick={handleStop}>Stop Recording</button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;