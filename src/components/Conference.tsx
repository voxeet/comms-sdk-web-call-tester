import React, { useState, useEffect, useRef } from "react";
import "../assets/css/call-tester.less";
import logo from "../assets/images/logo.png";
import AudioVuMeter from "./AudioVuMeter";
import { Chart, registerables, LineControllerChartOptions } from "chart.js";
import Bowser from "bowser";

import VoxeetSdk from "@voxeet/voxeet-web-sdk";
import { WebRTCStats } from "@voxeet/voxeet-web-sdk/types/models/Statistics";

type ConferenceProps = {
  accessToken: string;
  audioOnlyTest: boolean;
};

const Conference = ({
  accessToken = '',
  audioOnlyTest = false,
}: ConferenceProps) => {

  const [error, setError] = useState<string | null>(null);
  const [endTesting, setEndTesting] = useState(false);
  const [oldAudioValue, setOldAudioValue] = useState(0);
  const [mos, setMos] = useState(0);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [oldVideoValue, setOldVideoValue] = useState(0);
  const [oldTimestampVideo, setOldTimestampVideo] = useState(0);
  const [oldTimestampAudio, setOldTimestampAudio] = useState(0);
  const [timestampVideo, setTimestampVideo] = useState<string[]>([]);
  const [timestampAudio, setTimestampAudio] = useState<string[]>([]);
  const [videoHeight, setVideoHeight] = useState(480);
  const [videoWidth, setVideoWidth] = useState(640);
  const [intervalId, setIntervalId] = useState<any>();
  const [isValidBrowser, setIsValidBrowser] = useState(true);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [audioOnly, setAudioOnly] = useState(audioOnlyTest);
  const [initialized, setInitialized] = useState(false);
  const [sdkVersion, setSdkVersion] = useState('');
  const [nextTestAudioOnly, setNextTestAudioOnly] = useState(audioOnly);
  const [sessionOpenState, setSessionOpenState] = useState(false);
  const [joinConferenceState, setJoinConferenceState] = useState(false);
  const [createConferenceState, setCreateConferenceState] = useState(false);
  const [leaveConferenceState, setLeaveConferenceState] = useState(false);
  const [statsAudio, setStatsAudio] = useState<number[]>([]);
  const [statsVideo, setStatsVideo] = useState<number[]>([]);
  const [rawDataStats, setRawDataStats] = useState<WebRTCStats[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);
  const [network, setNetwork] = useState<any[]>([]);

  var videoElement = useRef<HTMLVideoElement>(null);
  var bitrateAudioElement = useRef<HTMLCanvasElement>(null);
  var bitrateVideoElement = useRef<HTMLCanvasElement>(null);
  var bitrateAudioChart: Chart | null = null;
  var bitrateVideoChart: Chart | null = null;

  useEffect(() => {
    if (!initialized) {
      Chart.register(...registerables);
      initializeConference();
    }

    return () => {
      clearInterval(intervalId);
    }
  }, []);

  const initializeConference = () => {
    VoxeetSdk.initializeToken(accessToken, () => new Promise((resolve) => resolve(accessToken)));

    startCallTest();
    setInitialized(true);
    setSdkVersion(VoxeetSdk.version);
  };

  const handleChangeAudioOnly = (e: React.FormEvent<EventTarget>) => {
    setNextTestAudioOnly(!nextTestAudioOnly);
  };

  const startCallTest = async () => {
    if (!VoxeetSdk.session.participant) {
      const userInfo = { name: "call-tester", externalId: "call-tester" };
      await VoxeetSdk.session.open(userInfo);
      setSessionOpenState(true);
    }

    runTest();
  };

  const runTest = async () => {
    setAudioOnly(nextTestAudioOnly);
    var constraints = {
      audio: true,
      video: nextTestAudioOnly ? false : true
    };
    var alreadyStarted = constraints.video;

    const conference = await VoxeetSdk.conference.create({
      alias: "call-tester-" + Math.floor(Math.random() * 1001),
      params: {
        stats: true,
        dolbyVoice: true,
      }
    });

    setCreateConferenceState(true);

    VoxeetSdk.conference.on("participantUpdated", async () => {
      if (!alreadyStarted && !audioOnly) {
        alreadyStarted = true;
        const videoConstraints: any = {
          mandatory: {
            minWidth: 640,
            minHeight: 480,
            maxWidth: 1920,
            maxHeight: 1080,
            minFrameRate: 10,
            maxFrameRate: 30
          }
        };

        try {
          await VoxeetSdk.video.local.start(videoConstraints);
          console.log("Video started");
        } catch (error) {
          console.error(error);
        }
      }
    });

    const joinConstraints = {
      constraints: constraints,
      dvwc: false, // DVWC does not expose audio stats
    };
    
    try {
      await VoxeetSdk.conference.join(conference, joinConstraints);

      const optionsBitrate: LineControllerChartOptions & any = {
        showLine: true,
        spanGaps: true,
        animation: false,
        plugins: {
          legend: {
              display: false,
          }
        },
        draggable: true,
        scales: {
          y: {
            title: {
              display: true,
              text: 'kbps',
              font: {
                family: "Open Sans",
                size: 14,
              },
            },
            ticks: {
              display: true,
              beginAtZero: true,
              min: 0,
              font: {
                family: "Open Sans",
                size: 14,
              },
            }
          },
          x: {
            title: {
              display: true,
              text: 'time',
              font: {
                family: "Open Sans",
                size: 14,
              },
            },
          }
        }
      };

      bitrateAudioChart = new Chart(bitrateAudioElement.current!, {
        type: "line",
        data: {
          datasets: [
            {
              label: "bitrate_audio",
              data: statsAudio,
              pointBorderWidth: 3,
              fill: false,
              borderColor: "#e57373",
              pointBorderColor: "#e57373",
              pointBackgroundColor: "#e57373",
              pointHoverRadius: 3,
              pointHoverBorderWidth: 1,
              pointRadius: 3,
              borderWidth: 1,
            }
          ],
        },
        options: optionsBitrate,
      });

      if (!nextTestAudioOnly) {
        bitrateVideoChart = new Chart(bitrateVideoElement.current!, {
          type: "line",
          data: {
            datasets: [
              {
                label: "bitrate_video",
                data: statsVideo,
                pointBorderWidth: 3,
                borderColor: "#e57373",
                pointBorderColor: "#e57373",
                pointBackgroundColor: "#e57373",
                fill: false,
                pointHoverRadius: 3,
                pointHoverBorderWidth: 1,
                pointRadius: 3,
                borderWidth: 1,
              }
            ],
          },
          options: optionsBitrate,
        });
      }

      var _intervalId = setInterval(getStats, 1000);
      setIntervalId(_intervalId);
      setJoinConferenceState(true);
      setAudioOnly(nextTestAudioOnly);
      
      setTimeout(async () => {
        const browser = Bowser.getParser(window.navigator.userAgent);
        const _browserInfo = browser.getBrowser();
        const _isValidBrowser = browser.satisfies({
          chrome: ">65",
          firefox: ">60",
          edge: ">17",
          safari: ">11",
          opera: ">57"
        });

        clearInterval(_intervalId);
        setIntervalId(null);
        setEndTesting(true);
        setIsValidBrowser(_isValidBrowser!);
        setBrowserInfo(_browserInfo);

        await VoxeetSdk.conference.leave();

        setLeaveConferenceState(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: !audioOnly
        });

        if (!audioOnly && videoElement.current) {
          const nav: any = navigator;
          nav.attachMediaStream(videoElement.current, stream);
          setVideoHeight(stream.getVideoTracks()[0].getSettings().height!);
          setVideoWidth(stream.getVideoTracks()[0].getSettings().width!);
        }
        setUserStream(stream);

        let selectedVideoDeviceLabel: any = null;
        let selectedAudioDeviceLabel: any = null;
        stream.getTracks().forEach(track => {
          if ("video" == track.kind) {
            selectedVideoDeviceLabel = track.label
          } else if ("audio" == track.kind) {
            selectedAudioDeviceLabel = track.label;
          }
        });

        if (navigator.mediaDevices?.enumerateDevices) {
          const sources = await navigator.mediaDevices.enumerateDevices();
          let _audioDevices = new Array<MediaDeviceInfo>();
          let _videoDevices = new Array<MediaDeviceInfo>();
          let _outputDevices = new Array<MediaDeviceInfo>();
          let _selectedVideoDevice = "";
          let _selectedAudioDevice = "";

          sources.forEach(source => {
            if (source.kind === "videoinput") {
              _videoDevices.push(source);
              if (selectedVideoDeviceLabel == source.label) {
                _selectedVideoDevice = source.deviceId;
              }
            }
            if (source.kind === `audioinput`) {
              _audioDevices.push(source);
              if (selectedAudioDeviceLabel == source.label) {
                _selectedAudioDevice = source.deviceId;
              }
            }
            if (source.kind === "audiooutput") {
              _outputDevices.push(source);
            }
          });

          setAudioDevices(_audioDevices);
          setOutputDevices(_outputDevices);
          setVideoDevices(_videoDevices);
          setSelectedAudioDevice(_selectedAudioDevice);
          setSelectedVideoDevice(_selectedVideoDevice);
        }
      }, 15000);
    } catch (error) {
      setError("An error occurred during joining the conference, please make sure that devices are allowed.");
      setEndTesting(true);
    }
  }

  const reStartTesting = async () => {
    setEndTesting(false);
    setError(null);
      setStatsAudio([]);
      setStatsVideo([]);
      setOldAudioValue(0);
      setMos(0);
      setUserStream(null);
      setOldVideoValue(0);
      setOldTimestampVideo(0);
      setOldTimestampAudio(0);
      setTimestampVideo([]);
      setNetwork([]);
      setTimestampAudio([]);
      setAudioDevices([]);
      setSelectedAudioDevice(null);
      setRawDataStats([]);
      setOutputDevices([]);
      setVideoDevices([]);
      setSelectedVideoDevice(null);
      setVideoHeight(480);
      setVideoWidth(640);
      setCreateConferenceState(false);
      setJoinConferenceState(false)
      setLeaveConferenceState(false);
      setIntervalId(null);
    if (initialized) {
      await startCallTest();
    } else {
      initializeConference();
    }
  };

  const getStats = async () =>{
    const stat: WebRTCStats = await VoxeetSdk.conference.localStats();
    const tmp: any[] = Array.from(stat.values())[0];
    rawDataStats.push(stat);

    for (var i = 0; i < Object.keys(tmp).length; i++) {
      if (tmp[i].type == "local-candidate") {
        let exist = false;
        network.map((net: any, count) => {
          if (tmp[i].id == net.id) exist = true;
        });
        if (!exist) {
          tmp[i].state = false;
          network.push(tmp[i]);
        }
      }

      if (tmp[i].type === "outbound-rtp" && tmp[i].mediaType === "audio") {
        if ((tmp[i].timestamp - oldTimestampAudio) / 1000 > 0) {
          const timeStr = new Date(tmp[i].timestamp).toLocaleTimeString();
          timestampAudio.push(timeStr);
          let bitrateAudio = tmp[i].bytesSent - oldAudioValue / ((tmp[i].timestamp - oldTimestampAudio) / 1000);
          setOldAudioValue(tmp[i].bytesSent);
          setOldTimestampAudio(tmp[i].timestamp);
          statsAudio.push(bitrateAudio * 8 / 1024);
          bitrateAudioChart!.data.labels!.push(timeStr);
          bitrateAudioChart!.data.datasets.forEach((dataset: any) => {
            dataset.data.push(bitrateAudio * 8 / 1024);
          });
        }
      }

      if (
        tmp[i].type === "outbound-rtp" &&
        tmp[i].mediaType === "video" &&
        !audioOnly
      ) {
        if ((tmp[i].timestamp - oldTimestampVideo) / 1000 > 0) {
          const timeStr = new Date(tmp[i].timestamp).toLocaleTimeString();
          timestampVideo.push(timeStr);
          let bitrateVideo = tmp[i].bytesSent - oldVideoValue / ((tmp[i].timestamp - oldTimestampVideo) / 1000);
          setOldVideoValue(tmp[i].bytesSent);
          setOldTimestampVideo(tmp[i].timestamp);
          statsVideo.push(bitrateVideo * 8 / 1024);
          bitrateVideoChart!.data.labels!.push(timeStr);
          bitrateVideoChart!.data.datasets.forEach((dataset: any) => {
            dataset.data.push(bitrateVideo * 8 / 1024);
          });
        }
      }

      if (
        tmp[i].type === "remote-inbound-rtp" &&
        tmp[i].mediaType === "audio"
      ) {
        var avgPL = ((tmp[i].packetsLost * 1.0) / tmp[i].packetsReceived) * 100;
        setMos(Math.max(1, Math.ceil(5 - avgPL / 4)));
      }

      if (!audioOnly) bitrateVideoChart?.update();
      bitrateAudioChart?.update();
    }

    for (var i = 0; i < Object.keys(tmp).length; i++) {
      if (tmp[i].type === "candidate-pair" && tmp[i].state === "succeeded") {
        for (var j = 0; j < network.length; j++) {
          if (network[j].id === tmp[i].localCandidateId) {
            network[j].state = true;
          }
        }
      }
    }

    setRawDataStats(rawDataStats);
    setNetwork(network);
    setStatsAudio(statsAudio);
    setTimestampAudio(timestampAudio);
    if (!audioOnly) {
      setStatsVideo(statsVideo);
      setTimestampVideo(timestampVideo);
    }
  };

  return (
    <div className="container">
      <div className="container-logo">
        <img src={logo} />
      </div>
      {endTesting && (
        <div className="block-start">
          <div className="container-start-test">
            <input
              type="checkbox"
              id="audioOnly"
              checked={nextTestAudioOnly}
              onChange={handleChangeAudioOnly}
            />
            <label id="audioOnlyLabel" htmlFor="audioOnly">
              Audio Only
            </label>
          </div>
          <div className="container-start-test">
            <button onClick={reStartTesting} className="btn">
              Restart testing
            </button>
          </div>
        </div>
      )}
      {error != null && <div className="block-error">{error}</div>}
      {error == null && (
        <div className="block block-canvas-graph">
          <div className="title-section">Quality call indicator</div>
          <div className="container-graph">
            <div className="title-graph">Audio bitrate</div>
            <canvas id="bitrateAudio" width="50%" height="40" ref={bitrateAudioElement}></canvas>
          </div>
          {!audioOnly && (
            <div className="container-graph">
              <div className="title-graph">Video bitrate</div>
              <canvas id="bitrateVideo" width="50%" height="40" ref={bitrateVideoElement}></canvas>
            </div>
          )}
        </div>
      )}
      {endTesting && error == null ? (
        <div>
          <div>
            <div className="container-stats"></div>

            <div className="block">
              <div className="title-section">Software Setup</div>
              <ul className="list">
                <li>
                  <div className="title">Browser compatibility</div>
                  <div>
                    {isValidBrowser ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
                <li>
                  <div className="title">Browser name</div>
                  <div>
                    {browserInfo && browserInfo.name}
                  </div>
                </li>
                <li>
                  <div className="title">Platform</div>
                  <div>{navigator.platform}</div>
                </li>
                <li>
                  <div className="title">Browser version</div>
                  <div>
                    {browserInfo && browserInfo.version}
                  </div>
                </li>
                <li>
                  <div className="title">Voxeet SDK version</div>
                  <div>
                    <a target="_blank" href={"https://www.npmjs.com/package/@voxeet/voxeet-web-sdk/v/" + sdkVersion}>{sdkVersion}</a>
                  </div>
                </li>
              </ul>
            </div>

            {network.length > 0 && (
              <div className="block">
                <div className="title-section">Network</div>
                <ul className="list list-network">
                  {network.map((net: any, i) => {
                    return (
                      <li key={i}>
                        <div className="title">Protocol: {net.protocol}</div>
                        <div>
                          IP: {" "}
                          {net.ip || net.address
                            ? net.ip || net.address
                            : "Unknown"}
                        </div>
                        <div>candidateType: {net.candidateType}</div>
                        <div>succeeded: {net.state ? "yes" : "no"}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="block">
              <div className="title-section">Hardware Setup Audio</div>
              <div className="contain-audio">
                <div className="container-input">
                  <label htmlFor="audioDevices">Microphone:</label>
                  <ul id="audioDevices">
                    {audioDevices.map((device, i) => (
                      selectedAudioDevice == device.deviceId ? (
                        <li key={device.label}>✅ {device.label}</li>
                      ) : (
                        <li key={device.label}>❌ {device.label}</li>
                      )
                    ))}
                    <li>
                      <AudioVuMeter audioStream={userStream} />
                    </li>
                  </ul>
                </div>

                {browserInfo.name == "Chrome" && (
                  <div className="container-output">
                    <label htmlFor="video">Output :</label>
                    <select
                      name="output"
                      className="form-control"
                      disabled={true}
                    >
                      {outputDevices.map((device, i) => (
                        <option key={i} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!audioOnly && (
            <div className="block">
              <div className="title-section">Hardware Setup Video</div>
              <div className="container-video">
                <video
                  className="video-participant"
                  width="360"
                  id="video-settings"
                  playsInline
                  height="280"
                  ref={videoElement}
                  autoPlay
                  muted
                />
              </div>
              <div className="form-group">
                <div>
                  <label htmlFor="videoDevices">Camera:</label>
                  <ul id="videoDevices">
                    {videoDevices.map((device, i) => (
                      selectedVideoDevice == device.deviceId ? (
                        <li key={device.label}>✅ {device.label}</li>
                      ) : (
                        <li key={device.label}>❌ {device.label}</li>
                      )
                    ))}
                  </ul>
                </div>
                <div>
                  Resolution: {videoWidth}x{videoHeight}
                </div>
              </div>
            </div>
          )}

          <div className="block">
            <div className="title-section">Communication with conference</div>
            <ul className="list">
              <li>
                <div className="title">Open a session</div>
                <div>
                  {sessionOpenState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Create the conference</div>
                <div>
                  {createConferenceState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Join the conference</div>
                <div>
                  {joinConferenceState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Leave the conference</div>
                <div>
                  {leaveConferenceState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
            </ul>
          </div>

          <div className="block-footer">
              <div className="container-start-test">
                <p>Powered by <a href="https://dolby.io" target="_blank">Dolby.io</a> - <a href="https://github.com/dolbyio-samples/comms-sdk-web-call-tester" target="_blank">GitHub repo</a></p>
              </div>
          </div>
        </div>
      ) : (
        error == null && (
          <div className="block-loading">
            <div id="loader-container">
              <div className="loader"></div>
            </div>
            <div className="state-testing">
              Test is in progress, please wait<span className="one">.</span>
              <span className="two">.</span>
              <span className="three">.</span>​
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default Conference;
