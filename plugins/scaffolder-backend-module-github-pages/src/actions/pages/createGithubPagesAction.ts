import { InputError } from '@backstage/errors';
import {
  GithubCredentialsProvider,
  ScmIntegrationRegistry,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import {
  createTemplateAction,
  parseRepoUrl,
} from '@backstage/plugin-scaffolder-node';
import { examples } from './createGithubPagesAction.examples';
import { getOctokitOptions } from '@backstage/plugin-scaffolder-backend-module-github';

/**
 * Creates a new action that enables GitHub Pages for a repository.
 *
 * @public
 */
export function createGithubPagesAction(options: {
  integrations: ScmIntegrationRegistry;
  githubCredentialsProvider?: GithubCredentialsProvider;
}) {
  const { integrations, githubCredentialsProvider } = options;

  return createTemplateAction<{
    repoUrl: string;
    buildType?: 'legacy' | 'workflow';
    sourceBranch?: string;
    sourcePath?: '/' | '/docs';
    token?: string;
  }>({
    id: 'github:pages',
    examples,
    description: 'Enables GitHub Pages for a repository.',
    schema: {
      input: {
        type: 'object',
        required: ['repoUrl'],
        properties: {
          repoUrl: {
            title: 'Repository Location',
            description: `Accepts the format 'github.com?repo=reponame&owner=owner' where 'reponame' is the new repository name and 'owner' is an organization or username`,
            type: 'string',
          },
          buildType: {
            title: 'Build Type',
            type: 'string',
            description: 'The GitHub Pages build type - "legacy" or "workflow"',
          },
          sourceBranch: {
            title: 'Source Branch',
            type: 'string',
            description: 'The the GitHub Pages source branch',
          },
          sourcePath: {
            title: 'Source Path',
            type: 'string',
            description: 'The the GitHub Pages source path - "/" or "/docs"',
          },
          token: {
            title: 'Authorization Token',
            type: 'string',
            description: 'The token to use for authorization to GitHub',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        repoUrl,
        buildType = 'workflow',
        sourceBranch = 'main',
        sourcePath = '/',
        token: providedToken,
      } = ctx.input;

      const octokitOptions = await getOctokitOptions({
        integrations,
        credentialsProvider: githubCredentialsProvider,
        token: providedToken,
        repoUrl: repoUrl,
      });
      const client = new Octokit(octokitOptions);

      const { owner, repo } = parseRepoUrl(repoUrl, integrations);

      if (!owner) {
        throw new InputError('Invalid repository owner provided in repoUrl');
      }

      ctx.logger.info(
        `Attempting to enable GitHub Pages for ${owner}/${repo} with "${buildType}" build type, on source branch "${sourceBranch}" and source path "${sourcePath}"`,
      );

      await client.request('POST /repos/{owner}/{repo}/pages', {
        owner: owner,
        repo: repo,
        build_type: buildType,
        source: {
          branch: sourceBranch,
          path: sourcePath,
        },
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      ctx.logger.info('Completed enabling GitHub Pages');
    },
  });
}
