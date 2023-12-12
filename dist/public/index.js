import { entries } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
function CreateAudioListZapis(nazivZapisa, audioBlob, synced) {
    const audioUrl = URL.createObjectURL(audioBlob);
    $('#audioZapisi').append(`
        <li class="audioZapis">
            <audio src='${audioUrl}' controls></audio>
            <h5>${nazivZapisa} - ${synced ? '[Cloud Synced]' : '[Not Synced]'}</h5>
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
            CreateAudioListZapis(zapis.naziv, new Blob([new Uint8Array(zapis.audioBlob.data)], { type: "audio/ogg;codecs=opus" }), true);
        }
    })
    .catch(err => console.error(err));

// Fetchaj iz indexDB (oni nisu se mogli spremiti u bazu jer recimo nije bilo interneta, a ne podržavamo sync)
entries().then((entries) => {
    for (const entry of entries) {
        const key = entry[0];
        const value = entry[1];
        CreateAudioListZapis(value.naziv, value.audioBlob, false);
    }
});

// Push notification subscribtion
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


async function setupPushSubscription() {
    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (sub === null) {
            const publicKey = "BHt50kvw32I1MzmaCzsxxs6jthmqnHzab-iOM5dSZqVsbQ_LltA1q8LVh_U9VtxxHFNsnjg-ihDSfq1joEASeDc";
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
            const res = await fetch("/api/saveSubscription", {
                method: "POST", headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                }, body: JSON.stringify({ sub }),
            });
            if (res.ok) {
                $('#notificationButton').children().eq(0).addClass('green-text text-darken-4');
                console.log("Notifications Subscribed");
            } else {
                alert('Greška kod pretplate, pokušajte kasnije...');
                // Makni pretplatu
                await sub.unsubscribe();
            }
        } else { 
            alert("You are already subscribed"); 
            $('#notificationButton').prop('disabled', true);
            $('#notificationButton').children().eq(0).addClass('green-text text-darken-4');
        }
    } catch (error) {
        alert("Trenutno nije moguće pretplatiti se na obavijesti, pokušajte kasnije...");
        // Makni pretplatu
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
    }
}

// Provjeri ako klijent podržava notifications API
if ("Notification" in window && "serviceWorker" in navigator) {
    $('#notificationButton').on('click', async () => {
        Notification.requestPermission(async (res) => {
            if (res === "granted") {
                await setupPushSubscription();
            } else {
                console.log("Korisnik nije dao prava za notification API!");
            }
        });
    });
} else {
    $('#notificationButton').prop('disabled', true);
    $('#notificationButton').children().eq(0).addClass('red-text text-darken-4');
}