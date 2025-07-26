module.exports = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[(tech|feature|fix)\]\s+(.*)$/,
      headerCorrespondence: ['type', 'subject'],
    },
  },
  rules: {
    'header-match-team-pattern': [2, 'always'],
    'header-min-length': [2, 'always', 10],
    'header-max-length': [2, 'always', 100],
  },
  plugins: [
    {
      rules: {
        'header-match-team-pattern': (parsed) => {
          const { type, subject } = parsed;
          if (type === null) {
            return [
              false,
              'Commit message must start with [tech], [feature], or [fix] followed by a message',
            ];
          }
          if (!subject || subject.trim() === '') {
            return [false, 'Commit message must include a description after the tag'];
          }
          return [true];
        },
      },
    },
  ],
};
