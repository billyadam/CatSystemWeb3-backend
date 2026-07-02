/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 *
 * Adds the remaining BioProfile columns to bio_profiles:
 *   - pattern_category, pattern_visual, pattern_color  (from PatternType struct)
 *   - body_type, distinctive_marks, blood_type
 *   - temperament, energy_level, social_behavior
 *   - special_skill, likes, dislikes, additional_notes
 *
 * Existing rows are kept intact — all new columns default to ''.
 * The old `description` column is left in place for backward compatibility.
 */
exports.up = async function (knex) {
  const newColumns = [
    // PatternType sub-fields (stored as flat string columns)
    { name: 'pattern_category',  type: 'string', length: 16  },
    { name: 'pattern_visual',    type: 'string', length: 16  },
    { name: 'pattern_color',     type: 'string', length: 16  },
    // Physical
    { name: 'body_type',         type: 'string', length: 16  },
    { name: 'distinctive_marks', type: 'string', length: 128 },
    { name: 'blood_type',        type: 'string', length: 4   },
    // Personality
    { name: 'temperament',       type: 'string', length: 16  },
    { name: 'energy_level',      type: 'string', length: 16  },
    { name: 'social_behavior',   type: 'string', length: 32  },
    { name: 'special_skill',     type: 'string', length: 64  },
    { name: 'likes',             type: 'string', length: 128 },
    { name: 'dislikes',          type: 'string', length: 128 },
    { name: 'additional_notes',  type: 'string', length: 256 },
  ];

  await knex.schema.alterTable('bio_profiles', (table) => {
    for (const col of newColumns) {
      table.string(col.name, col.length).notNullable().defaultTo('');
    }
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 *
 * Drops only the columns added by this migration.
 * Does NOT drop the bio_profiles table — other data is preserved.
 */
exports.down = async function (knex) {
  const addedColumns = [
    'pattern_category',
    'pattern_visual',
    'pattern_color',
    'body_type',
    'distinctive_marks',
    'blood_type',
    'temperament',
    'energy_level',
    'social_behavior',
    'special_skill',
    'likes',
    'dislikes',
    'additional_notes',
  ];

  await knex.schema.alterTable('bio_profiles', (table) => {
    for (const col of addedColumns) {
      table.dropColumn(col);
    }
  });
};
