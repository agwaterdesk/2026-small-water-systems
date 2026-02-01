import fs from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask for user input with a default value
const askQuestion = (query, defaultValue) => {
  return new Promise((resolve) => {
    rl.question(`${query} [${defaultValue}] (press Enter to confirm): `, (answer) => {
      resolve(answer || defaultValue);
    });
  });
};

// Function to replace text in a file
const replaceInFile = (filePath, searchText, replaceText) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(new RegExp(searchText, 'g'), replaceText);
  fs.writeFileSync(filePath, content);
};

// Function to update the README title
const updateReadmeTitle = (slug) => {
  const readmePath = 'README.md';
  const newTitle = `# ${slug} | AG & Water Desk Svelte Template`;
  let content = fs.readFileSync(readmePath, 'utf8');
  content = content.replace(/^# AG & Water Desk Svelte Template/m, newTitle);
  fs.writeFileSync(readmePath, content);
};

// Function to check if a git remote exists
const remoteExists = (remoteName) => {
  try {
    execSync(`git remote get-url ${remoteName}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
};

async function setupProject() {
  try {
    console.log('🚀 Starting project setup...\n');

    // Get the default project slug from the folder name
    const defaultSlug = path.basename(process.cwd());

    // Get project slug from user, with default value
    const slug = await askQuestion('Enter your project slug', defaultSlug);
    if (!slug) {
      throw new Error('Project slug is required');
    }

    // Replace placeholders in project.config.json
    console.log('\n📝 Updating project configuration...');
    replaceInFile('project.config.json', '\\[insert project slug\\]', slug);

    // Replace placeholders in index.html
    console.log('📝 Updating index.html...');
    replaceInFile('index.html', '\\[insert slug\\]', slug);

    // Update README title
    console.log('📝 Updating README.md title...');
    updateReadmeTitle(slug);

    // Install dependencies
    console.log('\n📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Check if git is already initialized
    if (!fs.existsSync('.git')) {
      // Initialize git
      console.log('\n🔧 Setting up git...');
      execSync('git init', { stdio: 'inherit' });
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "Initial commit"', { stdio: 'inherit' });
    } else {
      console.log('\n🔧 Git is already initialized. Skipping git setup.');
    }

    // Set up remote repository
    const repoName = await askQuestion('\nEnter the GitHub repository name', slug);
    if (!repoName) {
      throw new Error('Repository name is required');
    }

    const remoteUrl = `git@github.com:agwaterdesk/${repoName}.git`;
    if (remoteExists('origin')) {
      console.log('\n🔧 Remote origin already exists. Skipping remote setup.');
    } else {
      execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
    }

    console.log('\n✨ Project setup complete!');

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
setupProject(); 