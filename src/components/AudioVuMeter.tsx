import React, { useEffect, useState } from 'react'

type AudioVuMeterProps = {
    audioStream: MediaStream | null;
};

const AudioVuMeter = ({
    audioStream
}: AudioVuMeterProps) => {
    const [level, setLevel] = useState(0);
    const [javascriptNode, setJavascriptNode] = useState<ScriptProcessorNode | null>(null);
    const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [userAudioStream, setUserAudioStream] = useState<MediaStream | null>(audioStream);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        if (javascriptNode != null && audioContext != null && userAudioStream != null && microphone != null && analyser != null) {
            console.log("RESET NODE");
            javascriptNode.disconnect(audioContext.destination);
            javascriptNode.onaudioprocess = null
            microphone.disconnect()
            analyser.disconnect()

            setLevel(0);
            setJavascriptNode(null);
            setMicrophone(null);
            setAnalyser(null);
            setAudioContext(null);
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function(stream: MediaStream) {
                const _audioContext = new window.AudioContext();
                const _analyser = _audioContext.createAnalyser();
                const _microphone = _audioContext.createMediaStreamSource(stream);
                const _javascriptNode = _audioContext.createScriptProcessor(2048, 1, 1);
                _javascriptNode.connect(_audioContext.destination);
                _analyser.smoothingTimeConstant = 0.8;
                _analyser.fftSize = 1024;
                _microphone.connect(_analyser);
                _analyser.connect(_javascriptNode);
                _javascriptNode.connect(_audioContext.destination);
                _javascriptNode.onaudioprocess = function() {
                    const array = new Uint8Array(_analyser.frequencyBinCount);
                    _analyser.getByteFrequencyData(array);

                    let values = 0;
                    const length = array.length;
                    for (var i = 0; i < length; i++) {
                        values += (array[i]);
                    }
            
                    const average = values / length;
                    setLevel(average);
                };

                setAudioContext(_audioContext);
                setMicrophone(_microphone);
                setJavascriptNode(_javascriptNode);
                setUserAudioStream(stream);
                setAnalyser(_analyser);
            });
        
        return () => {
            if (javascriptNode != null && audioContext != null) {
                javascriptNode.disconnect(audioContext.destination);
                javascriptNode.onaudioprocess = null
                setJavascriptNode(null);
            }
            microphone?.disconnect()
            analyser?.disconnect()
        };
    }, []);

    return (
        <ul className="loadbar">
            {[...Array(20)].map((_, i: number) =>
                <li key={`loadbar_${i}`}>
                    <div className={`bar ${(level >= i ? 'ins' : '')}`}></div>
                </li>
            )}
        </ul>
    );
};

export default AudioVuMeter;
