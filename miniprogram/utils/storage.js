// utils/storage.js - 存储封装（localStorage → wx.setStorageSync）
const KEY = 'kaogong_save';
const META_KEY = 'kaogong_meta';

module.exports = {
  save(data) {
    try {
      wx.setStorageSync(KEY, data);
    } catch (e) {
      console.error('存档失败', e);
    }
  },
  load() {
    try {
      return wx.getStorageSync(KEY);
    } catch (e) {
      return null;
    }
  },
  hasSave() {
    try {
      return !!wx.getStorageSync(KEY);
    } catch (e) {
      return false;
    }
  },
  deleteSave() {
    try {
      wx.removeStorageSync(KEY);
    } catch (e) {}
  },
  saveMeta(meta) {
    try {
      wx.setStorageSync(META_KEY, meta);
    } catch (e) {}
  },
  loadMeta() {
    try {
      return wx.getStorageSync(META_KEY) || {};
    } catch (e) {
      return {};
    }
  }
};
