"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.DeliveryStatus = exports.VideoStatus = exports.PackingStatus = exports.CameraStatus = exports.StationStatus = void 0;
var StationStatus;
(function (StationStatus) {
    StationStatus["ONLINE"] = "ONLINE";
    StationStatus["OFFLINE"] = "OFFLINE";
    StationStatus["BUSY"] = "BUSY";
    StationStatus["ERROR"] = "ERROR";
})(StationStatus || (exports.StationStatus = StationStatus = {}));
var CameraStatus;
(function (CameraStatus) {
    CameraStatus["CONNECTED"] = "CONNECTED";
    CameraStatus["RECORDING"] = "RECORDING";
    CameraStatus["DISCONNECTED"] = "DISCONNECTED";
    CameraStatus["ERROR"] = "ERROR";
})(CameraStatus || (exports.CameraStatus = CameraStatus = {}));
var PackingStatus;
(function (PackingStatus) {
    PackingStatus["PENDING"] = "PENDING";
    PackingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    PackingStatus["COMPLETED"] = "COMPLETED";
    PackingStatus["FAILED"] = "FAILED";
})(PackingStatus || (exports.PackingStatus = PackingStatus = {}));
var VideoStatus;
(function (VideoStatus) {
    VideoStatus["RECORDING"] = "RECORDING";
    VideoStatus["UPLOADING"] = "UPLOADING";
    VideoStatus["PROCESSED"] = "PROCESSED";
    VideoStatus["ACTIVE"] = "ACTIVE";
    VideoStatus["EXPIRED"] = "EXPIRED";
    VideoStatus["DELETED"] = "DELETED";
    VideoStatus["ERROR"] = "ERROR";
})(VideoStatus || (exports.VideoStatus = VideoStatus = {}));
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "PENDING";
    DeliveryStatus["IN_TRANSIT"] = "IN_TRANSIT";
    DeliveryStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    DeliveryStatus["DELIVERED"] = "DELIVERED";
    DeliveryStatus["RETURNED"] = "RETURNED";
    DeliveryStatus["CANCELLED"] = "CANCELLED";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PACKER"] = "PACKER";
    UserRole["STATION"] = "STATION";
})(UserRole || (exports.UserRole = UserRole = {}));
//# sourceMappingURL=index.js.map