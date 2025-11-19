const fs = require('fs');
const https = require('https');
const path = require('path');

// Avatar seeds from the reference design
const avatarSeeds = [
  'Felix', 'Aneka', 'Zack', 'Midnight', 'Bandit', 'Cobra', 'Viper', 'Maverick',
  'Ace', 'King', 'Queen', 'Jack', 'River', 'Flop', 'Turn', 'Bluff',
  'Fold', 'Raise', 'Check', 'Call', 'AllIn', 'Stack', 'Chip', 'Dealer',
  'Shark', 'Fish', 'Whale', 'Donkey', 'Eagle', 'Hawk', 'Wolf', 'Bear',
  'Lion', 'Tiger', 'Dragon', 'Phoenix', 'Grinder', 'Pro', 'Noob', 'Luck',
  'Skill', 'Math', 'Read', 'Tell', 'Tilt', 'Zen', 'Focus', 'Win', 'Loss', 'Draw'
];

const outputDir = path.join(__dirname, '../public/avatars');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadAvatar(seed, index) {
  return new Promise((resolve, reject) => {
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    const filename = `avatar${index + 1}.svg`;
    const filepath = path.join(outputDir, filename);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${seed}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✓ Downloaded ${filename} (${seed})`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
}

async function generateAllAvatars() {
  console.log(`Generating ${avatarSeeds.length} avatars...`);

  for (let i = 0; i < avatarSeeds.length; i++) {
    try {
      await downloadAvatar(avatarSeeds[i], i);
    } catch (error) {
      console.error(`✗ Error downloading avatar ${i + 1}:`, error.message);
    }
  }

  console.log('\n✓ Avatar generation complete!');
  console.log(`Location: ${outputDir}`);
}

generateAllAvatars();
