import { entries } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
function CreateAudioListZapis(nazivZapisa, audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    $('#audioZapisi').append(`
        <li class="audioZapis">
            <audio src='${audioUrl}' controls></audio>
            <h5>${nazivZapisa}</h5>
        </li>
        `);
}

// Fetchaj iz baze
fetch('/api/audio')
    .then(res => res.json())
    .then(zapisi => {
        $('#loading').hide();
        for (const zapis of zapisi) {
            // Dobiveni sqlite3 buffer je Uint8Array koji se onda stavlja u Blob kao [Uint8Array], probal sam sve kombinacije konačno ova radi :)
            CreateAudioListZapis(zapis.naziv, new Blob([new Uint8Array(zapis.audioBlob.data)], { type: "audio/ogg;codecs=opus" }));
        }
    })
    .catch(err => console.error(err));

// Fetchaj iz indexDB (oni nisu se mogli spremiti u bazu jer recimo nije bilo interneta, a ne podržavamo sync)
entries().then((entries) => {
    for (const entry of entries) {
        const key = entry[0];
        const value = entry[1];
        CreateAudioListZapis(value.naziv, value.audioBlob);
    }
});