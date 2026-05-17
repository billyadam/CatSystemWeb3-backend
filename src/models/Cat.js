const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cat = sequelize.define(
  'Cat',
  {
    cat_pda: { type: DataTypes.STRING(64), primaryKey: true },
    owner_wallet: { type: DataTypes.STRING(64), allowNull: false },
    cat_index: { type: DataTypes.BIGINT, allowNull: false },
    name: { type: DataTypes.STRING(32), allowNull: false },
    gender: { type: DataTypes.STRING(16), allowNull: false },
    breed: { type: DataTypes.STRING(32), allowNull: false },
    coat_color: { type: DataTypes.STRING(32), allowNull: false },
    coat_length: { type: DataTypes.STRING(16), allowNull: false },
    eye_color: { type: DataTypes.STRING(32), allowNull: false },
    ear_type: { type: DataTypes.STRING(16), allowNull: false },
    body_size: { type: DataTypes.STRING(16), allowNull: false },
    description: { type: DataTypes.STRING(512), allowNull: false, defaultValue: '' },
    image_url_1: { type: DataTypes.STRING(256), allowNull: false },
    image_url_2: { type: DataTypes.STRING(256), allowNull: false },
    tx_signature: { type: DataTypes.STRING(128), allowNull: true },
    block_time: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    tableName: 'cats',
    underscored: true,
    indexes: [{ fields: ['owner_wallet'] }],
  }
);

module.exports = Cat;
