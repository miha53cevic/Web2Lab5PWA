import { set, entries } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

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

// Add/Save audio file
$('#addForm').on('submit', async (ev) => {
    ev.preventDefault();

    const naziv = $('#nazivAudio').val();
    const audioUrl = $('#audioPlayer').attr('src');
    if (!audioUrl) {
        alert("Potrebno unesti neki audio oblik!");
        return;
    }
    const audioBlob = await (await fetch(audioUrl)).blob();

    // Spremi u IndexDB
    const timestamp = new Date().toISOString();
    const id = `${timestamp}-${naziv}`;
    await set(id, {
        naziv: naziv,
        audioBlob: audioBlob,
    });
    // Provjeri ako postoji background sync podrška
    if (navigator.serviceWorker && "SyncManager" in window) {
        const swReg = await navigator.serviceWorker.ready;
        await swReg.sync.register('sync-save-audio');
        console.log("Queued for sync: ", id);
    } else {
        console.log("Ne podržavan Sync");
        // Pošalji ako ima interneta
        // Upload na server api
        entries().then((entries) => {
            for (const entry of entries) {
                const key = entry[0];
                const value = entry[1];
                const formData = new FormData();
                formData.append('id', key);
                formData.append('naziv', value.naziv);
                formData.append('audioBlob', value.audioBlob);
                fetch("/api/audio", {
                    method: "POST",
                    body: formData
                }).then(res => {
                    if (res.ok) {
                        del(key);
                    }
                })
                .catch(err => console.error(err));
            }
        });
        // Ako nema spremljen je u indexDB, i tamo lokalno čuvaj
    }

    alert('Uspješno dodani zapis!');
    window.location.reload();
});