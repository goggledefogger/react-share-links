"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isYoutubeUrl = exports.getYoutubeVideoId = void 0;
function getYoutubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
exports.getYoutubeVideoId = getYoutubeVideoId;
function isYoutubeUrl(url) {
    // if the linkData.url is from either youtube.com or youtu.be, case insensitive
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/i;
    return youtubeRegex.test(url);
}
exports.isYoutubeUrl = isYoutubeUrl;
//# sourceMappingURL=youtubeUtils.js.map