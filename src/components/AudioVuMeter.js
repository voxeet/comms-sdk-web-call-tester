import React, { Component } from 'react'
import PropTypes from 'prop-types'

class AudioVuMeter extends Component {

    constructor(props) {
        super(props)
        this.state = {
            level: 0,
            javascriptNode: null,
            microphone: null,
            analyser: null,
            userStream: null,
            audioContext: null
        }
    }

    componentWillUnmount() {
        this.state.javascriptNode.disconnect(this.state.audioContext.destination);
        this.state.javascriptNode.onaudioprocess = null
        this.state.javascriptNode = null
        this.state.microphone.disconnect()
        this.state.analyser.disconnect()
    }

    componentDidMount() {
            let currentComponent = this;
            if (this.state.javascriptNode != null && this.state.userStream != null) {
                console.log("RESET NODE")
                this.state.javascriptNode.disconnect(this.state.audioContext.destination);
                this.state.javascriptNode.onaudioprocess = null
                this.state.microphone.disconnect()
                this.state.analyser.disconnect()
                this.setState({ level: 0, javascriptNode: null, microphone: null, analyser: null, audioContext: null })
            }
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function(stream) {
                const audioCtx = window.AudioContext || window.webkitAudioContext || window.mozAudioContext
                const audioContext = new audioCtx()
                let analyser = audioContext.createAnalyser();
                let microphone = audioContext.createMediaStreamSource(stream);
                let javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                javascriptNode.connect(audioContext.destination);
                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;
                microphone.connect(analyser);
                analyser.connect(javascriptNode);
                javascriptNode.connect(audioContext.destination);
                javascriptNode.onaudioprocess = function() {
                    var array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    var values = 0;
                    
                    var length = array.length;
                    for (var i = 0; i < length; i++) {
                        values += (array[i]);
                    }
            
                    var average = values / length;
                    currentComponent.setState({ level: average })
                }
                currentComponent.setState({ audioContext: audioContext, microphone: microphone, javascriptNode: javascriptNode, userStream: stream, analyser:analyser })
            })
    }

    render() {
        const { level } = this.state
        return (
            <ul className="loadbar">
                {[...Array(20)].map((el, i) =>
                    <li key={`loadbar_${i}`}>
                        <div className={`bar ${(level >= i ? 'ins' : '')}`}></div>
                    </li>
                )}
            </ul>
        )
    }
}

AudioVuMeter.propTypes = {
    userStream: PropTypes.object
}

export default AudioVuMeter
