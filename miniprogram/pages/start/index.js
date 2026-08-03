// pages/start/index.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    hasSave: false
  },
  onLoad() {
    this.setData({ hasSave: storage.hasSave() });
  },
  goIdentity() {
    wx.navigateTo({ url: '/pages/identity/index' });
  },
  continueGame() {
    wx.navigateTo({ url: '/pages/game/index?continue=1' });
  }
});
