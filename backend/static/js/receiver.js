// Globals
//const form = document.getElementById('form')
//const answerP = document.getElementById('answer')
let downloadLink = document.getElementById('downloadLink')
let remoteConnection, receiverBuffer = [], receivedSize = 0
let offer, fileMeta


function get_offer() {
    let roomId = document.location.pathname.split('/')[2]
    if (roomId === "") return
    console.log("Getting offer and file meta from API...")
    let xhr = new XMLHttpRequest()
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        // console.log(e)
        if (e.target.readyState === 4) {
            let rsp = JSON.parse(JSON.parse(xhr.response))
            // console.log(rsp)
            offer = {
                type: rsp.type,
                sdp: rsp.sdp
            }
            fileMeta = {
                name: rsp["name"],
                size: rsp["size"],
                last_modifed: rsp["last_modified"]
            }
            // console.log(offer)
            // console.log(fileMeta)
            put_answer()
        }
    }
}

function put_answer() {
    console.log("Putting answer to API...")
    let xhr = new XMLHttpRequest()
    let roomId = document.location.pathname.split('/')[2]
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')

    remoteConnection.setRemoteDescription(offer).then(() => console.log("Connected to sender."))
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(() => {
        // answerP.innerHTML = JSON.stringify(remoteConnection.localDescription)
        xhr.send(JSON.stringify(remoteConnection.localDescription))
    })

    xhr.onreadystatechange = e => {
        // console.log(e)
        if (e.target.readyState === 4) {  // DONE
            console.log("Response: " + xhr.response)
        }
    }
}

// Connection establishment
window.onload = () => {
    console.log("Window loaded")
    const conf = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]}
    remoteConnection = new RTCPeerConnection(conf)
    remoteConnection.onicecandidate = () => {
        console.log("New ice candidate")
        JSON.stringify(remoteConnection.localDescription)
    }
    remoteConnection.ondatachannel = e => {
        const receiveChannel = e.channel
        receiveChannel.binaryType = 'arraybuffer'
        receiveChannel.onopen = () => console.log("Connection Opened")
        receiveChannel.onclose = () => console.log("Connection Closed")
        receiveChannel.onmessage = e => {
            console.log("Message from peer: " + e.data)
            receiverBuffer.push(e.data)
            receivedSize += e.data.byteLength
            if (receivedSize === fileMeta.size) {
                console.log('Download Complete!')
                const blob = new Blob(receiverBuffer)
                receiverBuffer = []
                receivedSize = 0
                downloadLink.href = URL.createObjectURL(blob)
                downloadLink.download = fileMeta.name
                downloadLink.textContent = `Download ${fileMeta.name}`
                // TODO: closeChannel()
            }
        }
        remoteConnection.channel = receiveChannel
        remoteConnection.addEventListener('datachannel',)
    }
    get_offer()
}
