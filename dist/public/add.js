// Provjeri ako browser podržava native api ako ne onda koristi fallback (file upload)
if (navigator.mediaDevices) {
    let recording = false;
    let recorder;
    let audioChunks = [];
    let intervalId;
    let recordingTimeSec = 0;

    async function Record() {
        audioChunks = [];
        recordingTimeSec = 0;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = function (ev) {
            audioChunks.push(ev.data);
        }
        recorder.onstop = function () {
            const blob = new Blob(audioChunks, { type: "audio/ogg;codecs=opus" });
            const audioUrl = URL.createObjectURL(blob);
            $('#audioPlayer').attr('src', audioUrl);
        }
        recorder.start();

        // recording timer
        intervalId = setInterval(() => {
            recordingTimeSec += 1;
            const min = Math.floor(recordingTimeSec / 60);
            const sec = Math.floor(recordingTimeSec % 60);
            let minString = `${min}`;
            let secString = `${sec}`;
            if (min < 10) minString = `0${minString}`;
            if (sec < 10) secString = `0${secString}`;
            $('#recordingTime').text(`${minString}:${secString}`);
        }, 1000)
    }

    async function StopRecording() {
        recorder.stop();

        // zaustavi recording timer
        clearInterval(intervalId);
    }

    $('#recordButton').on('click', () => {
        if (!recording) $('#recordButton').attr('class', 'stopRecord');
        else $('#recordButton').attr('class', 'record');
        recording = !recording;

        if (recording) Record();
        else StopRecording();
    });
} else {
    // fallback, koristi file upload
    $('#nativeAPI').hide();
}

// File upload
$('#uploadFile').on('change', (ev) => {
    const file = ev.target.files[0];
    const audioUrl = URL.createObjectURL(file);
    $('#audioPlayer').attr('src', audioUrl);
});