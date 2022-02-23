import process from 'node:process';
import { getRepository, push, SyncStatus } from '@sinedied/devto-cli';
import { commitAndPushUpdatedArticles } from './git.js';

export async function publishArticles(options) {
  const repo = process.env.GITHUB_REPOSITORY;

  const results = await push([options.filesGlob], {
    devtoKey: options.devtoKey || process.env.DEVTO_TOKEN,
    repo,
    branch: options.branch,
    checkImages: true,
    dryRun: options.dryRun
  });

  if (!results || results.length === 0) {
    return [];
  }

  const output = results.map((r) => ({
    status: r.status,
    publishedStatus: r.publishedStatus,
    title: r.article.data.title,
    id: r.article.data.id
  }));

  if (options.dryRun) {
    console.log('Running in dry run mode, skipping commit step.');
    return output;
  }

  const shouldCommit = results.some(
    (result) =>
      result.status === SyncStatus.created ||
      result.status === SyncStatus.updated ||
      result.status === SyncStatus.reconciled
  );

  if (shouldCommit) {
    await commitAndPushUpdatedArticles(
      results.map((result) => result.article),
      await getRepository(repo),
      options.branch,
      options.githubToken,
      options.useConventionalCommits
    );
  } else {
    console.log('No detected changes, skipping commit step.');
  }

  return output;
}
