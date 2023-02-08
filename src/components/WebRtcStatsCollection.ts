import { EventEmitter } from 'events';
import VoxeetSDK from "@voxeet/voxeet-web-sdk";

export type AudioOutputCollect = {
  timestamp: number;
  totalBytes?: number;
  totalPackets?: number;
  bitrate?: number;
  packetRate?: number;
  targetBitrate?: number;
  retransmittedPacketsSent?: number;
  retransmittedBytesSent?: number;
};

export type VideoOutputCollect = {
  timestamp: number;
  totalBytes?: number;
  totalPackets?: number;
  bitrate?: number;
  packetRate?: number;
  targetBitrate?: number;
  retransmittedPacketsSent?: number;
  retransmittedBytesSent?: number;

  frameWidth?: number;
  frameHeight?: number;
  framesPerSecond?: number;
  framesSent?: number;
};

export type OnCollectReady = {
  audioOutput: AudioOutputCollect;
  videoOutput: VideoOutputCollect;
};

class WebRTCStatsCollection extends EventEmitter {
  #intervalId: NodeJS.Timer | null = null;
  #rawData: RTCStats[][] = [];

  #timestampAudioOutput: number = 0;
  #totalBytesSentAudio: number = 0;
  #totalPacketsSentAudio: number = 0;

  #timestampVideoOutput: number = 0;
  #totalBytesSentVideo: number = 0;
  #totalPacketsSentVideo: number = 0;

  #audioOutputCollections: AudioOutputCollect[] = [];
  #videoOutputCollections: VideoOutputCollect[] = [];

  public startCollection = (rate: number = 1000) => {
    this.#rawData = [];
    this.#timestampAudioOutput = 0;
    this.#totalBytesSentAudio = 0;
    this.#totalPacketsSentAudio = 0;
    this.#timestampVideoOutput = 0;
    this.#totalBytesSentVideo = 0;
    this.#totalPacketsSentVideo = 0;
    this.#audioOutputCollections = [];
    this.#videoOutputCollections = [];

    this.#intervalId = setInterval(this.getStats, rate);
  };

  public stopCollection = () => {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  };

  private getStats = async () =>{
    const webRTCStats: RTCStatsReport = (await VoxeetSDK.conference.localStats()) as RTCStatsReport;

    // Only consider the local participant
    const statistics: RTCStats[] = Array.from(webRTCStats.values())[0];
    this.#rawData.push(statistics);

    var audioOutput: AudioOutputCollect | null = null;
    var videoOutput: VideoOutputCollect | null = null;

    for (let i = 0; i < Object.keys(statistics).length; i++) {
      const entry: RTCStats = statistics[i];

      if (entry.type === 'outbound-rtp') {
        const outEntry: RTCOutboundRtpStreamStats = entry as RTCOutboundRtpStreamStats;

        if (outEntry.kind === 'audio' && outEntry.timestamp - this.#timestampAudioOutput > 0) {
          const bitrate = (outEntry.bytesSent! - this.#totalBytesSentAudio) / ((entry.timestamp - this.#timestampAudioOutput) / 1000);
          const packetRate = (outEntry.packetsSent! - this.#totalPacketsSentAudio) / ((entry.timestamp - this.#timestampAudioOutput) / 1000);
          this.#timestampAudioOutput = outEntry.timestamp;
          this.#totalBytesSentAudio = outEntry.bytesSent!;
          this.#totalPacketsSentAudio = outEntry.packetsSent!;

          audioOutput = {
            timestamp: entry.timestamp,
            totalBytes: outEntry.bytesSent,
            totalPackets: outEntry.packetsSent,
            bitrate: bitrate,
            packetRate: packetRate,
            targetBitrate: outEntry.targetBitrate,
            retransmittedPacketsSent: outEntry.retransmittedPacketsSent,
            retransmittedBytesSent: outEntry.retransmittedBytesSent,
          };
        } else if (outEntry.kind === 'video' && entry.timestamp - this.#timestampVideoOutput > 0) {
          const bitrate = (outEntry.bytesSent! - this.#totalBytesSentVideo) / ((entry.timestamp - this.#timestampVideoOutput) / 1000);
          const packetRate = (outEntry.packetsSent! - this.#totalPacketsSentVideo) / ((entry.timestamp - this.#timestampVideoOutput) / 1000);
          this.#timestampVideoOutput = entry.timestamp;
          this.#totalBytesSentVideo = outEntry.bytesSent!;
          this.#totalPacketsSentVideo = outEntry.packetsSent!;

          videoOutput = {
            timestamp: entry.timestamp,
            totalBytes: outEntry.bytesSent,
            totalPackets: outEntry.packetsSent,
            bitrate: bitrate,
            packetRate: packetRate,
            targetBitrate: outEntry.targetBitrate,
            retransmittedPacketsSent: outEntry.retransmittedPacketsSent,
            retransmittedBytesSent: outEntry.retransmittedBytesSent,
            frameWidth: outEntry.frameWidth,
            frameHeight: outEntry.frameHeight,
            framesPerSecond: outEntry.framesPerSecond,
            framesSent: outEntry.framesSent,
          };
        }
      }

    }

    if (audioOutput != null) {
      this.#audioOutputCollections.push(audioOutput);
    }
    if (videoOutput != null) {
      this.#videoOutputCollections.push(videoOutput);
    }
    this.emit('collection', { audioOutput, videoOutput });
  };
};

export default WebRTCStatsCollection;
