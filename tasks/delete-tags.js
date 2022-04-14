const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');
const discover = require('../lib/batch-ghost-discover');

module.exports.initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                tag: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.tags = [];
            ctx.deleted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Fetch tags from Ghost API',
            task: async (ctx, task) => {
                if (typeof ctx.args.tag === 'object' && ctx.args.tag[0].id) {
                    ctx.tags = ctx.args.tag;
                } else {
                    let allTags = await discover({
                        api: ctx.api,
                        type: 'tags'
                    });

                    ctx.tags = [_.find(allTags, {name: ctx.args.tag})];
                }

                if (ctx.tags.length < 1) {
                    ctx.errors.push(`No tags found for "${ctx.args.tag}"`);
                    throw 'No tags found';
                }

                task.output = `Found ${ctx.tags.length} tags`;
            }
        },
        {
            title: 'Deleting tags from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.tags, async (tag) => {
                    tasks.push({
                        title: `${tag.name}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.tags.delete({id: tag.id});
                                ctx.deleted.push(result.name);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    name: tag.name
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        }
    ];
};

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
