var vid = document.getElementById('vid');
var mediaSource = new MediaSource();
var vidFolder = 'zen-cenc';

function onLoad() {
  var video = document.getElementById("vid");

  if (!video.mediaKeys) {
    navigator.requestMediaKeySystemAccess("org.w3.clearkey").then(
      function(keySystemAccess) {
        var promise = keySystemAccess.createMediaKeys();
        promise.catch(
          console.error.bind(console, "Unable to create MediaKeys")
        );
        promise.then(
          function(createdMediaKeys) {
            return video.setMediaKeys(createdMediaKeys);
          }
        ).catch(
          console.error.bind(console, "Unable to set MediaKeys")
        );
        promise.then(
          function(createdMediaKeys) {
            var initData = { 
              "kids": [ "1X1BbM1FTVoI0Fv/B0Ludg" ], 
              "type": "temporary" 
            };
            initData = JSON.stringify(initData);
            initData = str2ab(initData);
            
            var keySession = createdMediaKeys.createSession();
            keySession.addEventListener("message", handleMessage, false);
            return keySession.generateRequest("cenc", initData);
          }
        ).catch(
          console.error.bind(console, "Unable to create or initialize key session")
        );
      }
    );
  }
}

function handleMessage(event) {
  var keySession = event.target;

  // btoa doesn't work because it adds the equals at the end
  // "k": btoa("f15cae8f4e48a023056e1960ff2228b0"),
  // "kid": btoa("d57d416ccd454d5a08d05bff0742ee76")
  
  var license = { 
    "keys": [
      { 
        "kty":"oct",
        "alg":"A128KW",
        // Zencoder had a hex encoded version of the string by default
        // but here we need a base64url encoded version of the original key.
        // Had to use a hex to base64 converter, and then manually url encode it
        // by dropping the equal signs at the end. Might not be enough for all keys.
        // http://tomeko.net/online_tools/hex_to_base64.php?lang=en
        "k": "8Vyuj05IoCMFbhlg/yIosA",
        "kid": "1X1BbM1FTVoI0Fv/B0Ludg"
      }
    ],
    "type":"temporary" 
  }
  
  license = JSON.stringify(license);
  license = str2ab(license);

  // function ab2str(buf) {
  //   return String.fromCharCode.apply(null, new Uint8Array(buf));
  // }
  // // Test that str2ab worked correctly
  // console.log('license', ab2str(license));

  keySession.update(license).catch(
    console.error.bind(console, "update() failed")
  );
}

onLoad();

// MSE
mediaSource.addEventListener('sourceopen', function(){
  console.log('event: sourceopen');
  var sourceBuffer = mediaSource.addSourceBuffer('video/mp4;codecs=avc1.42c01f');

  GET(vidFolder+'/init.mp4', function(data){
    sourceBuffer.appendBuffer(data);
    appendNext(0);

    function appendNext(num){
      if (num > 2) {
        return false;
      } else {
        if (!sourceBuffer.updating) {
          GET(vidFolder+'/seg-'+num+'.m4f', function(data){
            sourceBuffer.appendBuffer(data);
            appendNext(num+1);
          });
        } else {
          setTimeout(function(){
            appendNext(num);
          }, 1000);
        }
      }
    }
  });

}, false);

vid.src = URL.createObjectURL(mediaSource);

function logEvent(event){
  console.log('event: '+event.type);
}

vid.addEventListener('needkey', logEvent);
vid.addEventListener('webkitneedkey', logEvent);
vid.addEventListener('msneedkey', logEvent);

vid.addEventListener('webkitkeymessage', logEvent);
vid.addEventListener('webkitkeyerror', logEvent);
vid.addEventListener('webkitkeyadded', logEvent);
vid.addEventListener('keymessage', logEvent);
vid.addEventListener('keyerror', logEvent);
vid.addEventListener('keyadded', logEvent);

vid.addEventListener('error', function(evt){
  console.log('error:', evt);
  console.log(evt.target.error);
}, false);

function GET(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.send();

  xhr.onload = function(e) {
    if (xhr.status != 200) {
      console.log("Unexpected status code " + xhr.status + " for " + url);
      return false;
    }
    callback(new Uint8Array(xhr.response));
  };
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}