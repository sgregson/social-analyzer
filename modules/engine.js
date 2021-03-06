var helper = require('./helper.js')
var tesseract = require("tesseract.js")

function merge_dicts(temp_dict){
  result = {}
  temp_dict.forEach(item => {
    for (const [key, value] of Object.entries(item)) {
      if (result[key]) {
        result[key] += value;
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

async function detect(type, uuid, username, options, site, source = "", screen_shot = "") {
  var all_results = [];
  var temp_profile = [];
  var temp_detected = [];
  var detections_count = 0;
  await Promise.all(site.detections.map(async detection => {
    if (detection.type == "shared") {
      var shared_detection = await helper.shared_detections.find(o => o.name === detection.name);
      var [val1, val2, val3] = await detect_logic("fast", uuid, username, options, shared_detection, source)
      temp_profile.push(val1)
      temp_detected.push(val2)
      detections_count += val3
    } else if (detection.type == "generic") {
      helper.verbose && console.log("None");
    } else if (detection.type == "special") {
      helper.verbose && console.log("None");
    }
  }));

  var [val1, val2, val3] = await detect_logic("fast", uuid, username, options, site, source)
  temp_profile.push(val1)
  temp_detected.push(val2)
  detections_count += val3
  //console.log(temp_profile,merge_dicts(temp_detected),detections_count)
  return [merge_dicts(temp_profile),merge_dicts(temp_detected),detections_count]
}

async function detect_logic(type, uuid, username, options, site, source = "", screen_shot = "") {
  var temp_profile = Object.assign({}, helper.profile_template);
  var temp_detected = Object.assign({}, helper.detected_websites);
  var detections_count = 0;
  await Promise.all(site.detections.map(async detection => {
    if (source != "" && helper.detection_level[helper.detection_level.current][type].includes(detection.type) && detection.type != "shared" && detection.type != "generic" && detection.type != "special") {
      try {
        detections_count += 1
        temp_detected.count += 1
        var temp_found = "false"
        if (detection.type == "ocr" && screen_shot != "" && options.includes("FindUserProfilesSlow")) {
          const temp_buffer_image = Buffer.from(screen_shot, "base64")
          await tesseract.recognize(temp_buffer_image, "eng").then(result => {
              text = result.data.text.replace(/[^A-Za-z0-9]/gi, "");
              detection.string = detection.string.replace(/[^A-Za-z0-9]/gi, "");
              if (text != "") {
                if (text.toLowerCase().includes(detection.string.toLowerCase())) {
                  temp_found = "true";
                }
                if (detection.return == temp_found) {
                  temp_profile.found += 1
                  temp_detected.ocr += 1
                  if (detection.return == 'true') {
                    temp_detected.true += 1
                  } else {
                    temp_detected.false += 1
                  }
                }
              }
            })
            .catch(err => {
              helper.verbose && console.log(err);
            })
        } else if (detection.type == "normal" && source != "") {
          if (source.toLowerCase().includes(detection.string.replace("{username}", username).toLowerCase())) {
            temp_found = "true";
          }

          if (detection.return == temp_found) {
            temp_profile.found += 1
            temp_detected.normal += 1
            if (detection.return == 'true') {
              temp_detected.true += 1
            } else {
              temp_detected.false += 1
            }
          }
        } else if (detection.type == "advanced" && text_only != "") {
          if (text_only.toLowerCase().includes(detection.string.replace("{username}", username).toLowerCase())) {
            temp_found = "true";
          }

          if (detection.return == temp_found) {
            temp_profile.found += 1
            temp_detected.advanced += 1
            if (detection.return == 'true') {
              temp_detected.true += 1
            } else {
              temp_detected.false += 1
            }
          }
        }
      } catch (err) {
        helper.verbose && console.log(err);
      }
    }
  }));

  helper.verbose && console.log({
    "Temp Profile": temp_profile,
    "Detected": temp_detected
  })

  return [temp_profile, temp_detected, detections_count]
}

module.exports = {
  detect
}
