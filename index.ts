import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Octokit } from 'octokit';
import 'dotenv/config';

const auth = process.env.ACCESS_TOKEN;

const octokit = new Octokit({ auth });

const ingoredLanguages = ['HTML', 'EJS', 'Pug', 'Astro', 'CSS', ''];

type Repo = {
  fork: boolean;
  languages_url: string;
  name: string;
};

type LanguageData = {
  [key: string]: {
    chars: number;
    percentage: number;
  };
};

(async () => {
  // const json: {
  //   repo: string;
  //   languages: {
  //     [key: string]: number;
  //   };
  // }[] = JSON.parse(fs.readFileSync('./tmp/result.json', 'utf-8'));

  console.info('fetching repos...');

  const { data } = await axios<{ items: Repo[] }>(
    'https://api.github.com/search/repositories?q=user:leifarriens&per_page=100',
    {
      headers: {
        Authorization: `Bearer ${auth}`,
      },
    },
  );

  const repos = data.items.filter((repo: Repo) => {
    return !repo.fork;
  });

  const languagePromises = repos.map((repo) => getRepoLanguages(repo.name));

  console.info('fetching repo languages...');

  const languageResponses = await Promise.all(languagePromises);

  console.info('transforming data...');

  const languages = languageResponses
    .map((entry) => entry.languages)
    .filter((entry) => Object.keys(entry).length !== 0)
    .reduce((curr, acc) => {
      for (let key in acc) {
        if (!curr[key]) {
          curr[key] = acc[key];
        } else {
          curr[key] = curr[key] + acc[key];
        }
      }
      return curr;
    }, {});

  const sortedLanguages = Object.fromEntries(
    Object.entries(languages)
      .filter(([name]) => {
        return !ingoredLanguages.includes(name);
      })
      .sort(([, a], [, b]) => b - a),
  );

  const totalChars = Object.values(sortedLanguages).reduce((curr, acc) => curr + acc, 0);

  const languagesData: LanguageData = Object.entries(sortedLanguages).reduce(
    (curr, [name, value]) => {
      return {
        ...curr,
        [name]: {
          chars: value,
          percentage: (value / totalChars) * 100,
        },
      };
    },
    {},
  );

  console.info('building README.md...');

  const statsHtml = buildStatsHtml();
  const tableMarkdown = buildLanguageTable(languagesData);

  const readme = parseReadmeTemplate([
    ['{languages}', tableMarkdown],
    ['{stats}', statsHtml],
  ]);

  fs.writeFileSync('./README.md', readme);
  console.info('Done.');
})();

async function getRepoLanguages(repo: string) {
  const { data } = await octokit.rest.repos.listLanguages({
    owner: 'leifarriens',
    repo,
  });

  return { repo, languages: data };
}

function buildLanguageTable(languagesData: LanguageData) {
  const head = Object.keys(languagesData).reduce((curr, acc) => {
    return `${curr}${acc}|`;
  }, '|');

  const separator = Object.keys(languagesData).reduce((curr) => {
    return `${curr}:---:|`;
  }, '|');

  const data = Object.values(languagesData).reduce((curr, acc) => {
    return `${curr}${acc.percentage.toFixed(2)}%|`;
  }, '|');

  const tableMarkdown = [head, separator, data].reduce((curr, acc) => {
    return `${curr}${acc}\n`;
  }, '');

  return tableMarkdown;
}

function buildStatsHtml() {
  const url = new URL('https://github-readme-stats.vercel.app/api');
  url.searchParams.set('username', 'leifarriens');
  url.searchParams.set('show_icons', String(true));
  url.searchParams.set('hide_title', String(true));
  url.searchParams.set('hide_rank', String(true));
  url.searchParams.set('count_private', String(true));
  url.searchParams.set('disable_animations', String(true));

  const src = url.toString();

  return String(`
  <picture>
    <source
      srcset="${src}&theme=github_dark"
      media="(prefers-color-scheme: dark)"
    />
    <source
      srcset="${src}"
      media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)"
    />
    <img src="${src}" />
  </picture>`).trim();
}

function parseReadmeTemplate(toParse: [string, string][]) {
  let readmeTemplate = fs.readFileSync(path.join(__dirname, 'template', 'README.md'), 'utf-8');

  toParse.forEach(([key, data]) => {
    readmeTemplate = readmeTemplate.replace(key, data);
  });

  return readmeTemplate;
}
