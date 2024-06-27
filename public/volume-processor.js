class VolumeProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this._lastAverage = 0;
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
        const samples = input[0];
        let total = 0;
        for (let i = 0; i < samples.length; i++) {
          total += Math.abs(samples[i]);
        }
        const average = total / samples.length;
        if (average !== this._lastAverage) {
          this.port.postMessage({ average });
          this._lastAverage = average;
        }
      }
      return true;
    }
  }
  
  registerProcessor('volume-processor', VolumeProcessor);