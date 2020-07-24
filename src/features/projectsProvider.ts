import * as vscode from 'vscode';
import project from '../models/project';
import todoistAPIHelper from '../helpers/todoistAPIHelper';
import task from '../models/task';
import { todoistTreeView } from '../models/todoistTreeView';
import settingsHelper from '../helpers/settingsHelper';
import path = require('path');

export class projectsProvider implements vscode.TreeDataProvider<todoistTreeView> {

    private apiHelper: todoistAPIHelper;
    private state: vscode.Memento;

    private _onDidChangeTreeData: vscode.EventEmitter<todoistTreeView | undefined> = new vscode.EventEmitter<todoistTreeView | undefined>();
    onDidChangeTreeData?: vscode.Event<todoistTreeView | null | undefined> | undefined = this._onDidChangeTreeData.event;

    refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    constructor(context: vscode.Memento) {
        this.state = context;
        this.apiHelper = new todoistAPIHelper(context);
    }

    getTreeItem(element: todoistTreeView): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const data = settingsHelper.getTodoistData(this.state);
        if (data.tasks.some(task => task.parent?.toString() == element.id)) {
            element.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        }
        return element;
    }

    getChildren(element?: todoistTreeView | undefined): vscode.ProviderResult<todoistTreeView[]> {
        const api = this.apiHelper;
        const data = settingsHelper.getTodoistData(this.state);

        if (element) {
            return Promise.resolve(new Promise(function (resolve, reject) {
                let treeView: todoistTreeView[] = [];
                if (data.projects && data.projects.length > 0) {
                    let projects = formatProjects(data.projects.filter(p => p.parent && p.parent == parseInt(element.id!)));
                    treeView.push(...projects);
                }
                if (data.tasks && data.tasks.length > 0) {
                    let tasks = formatTasks(data.tasks.filter(
                        t => (!t.parent && t.project_id.toString() === element.id)
                            || t.parent?.toString() == element.id));
                    treeView.push(...tasks);
                    resolve(treeView);
                }
                else {
                    api.getActiveTasks().then((tasks: task[]) => {
                        treeView.push(...formatTasks(tasks.filter(t => t.project_id.toString() === element.id)));
                        resolve(treeView);
                    });
                }
            }));
        }
        else {
            return Promise.resolve(new Promise(function (resolve, reject) {
                if (data.projects && data.projects.length > 0) {
                    resolve(formatProjects(data.projects.filter(p => !p.parent)));
                }
                else {
                    api.getProjects().then((projects: project[]) => {
                        resolve(formatProjects(projects.filter(p => !p.parent)));
                    });
                }
            }));
        }
    }
}

function formatTasks(tasks: task[]) {
    let activeTasks: todoistTreeView[] = [];
    tasks = tasks.sort((a, b) => a.order > b.order ? 1 : 0);
    tasks.forEach(t => {
        let treeview = new todoistTreeView(t.content);
        treeview.id = t.id.toString();
        treeview.tooltip = t.content;
        treeview.collapsibleState = vscode.TreeItemCollapsibleState.None;
        treeview.task = t;
        treeview.contextValue = 'todoistTask';
        treeview.command = {
            command: 'todoist.openTask',
            title: 'Open task',
            arguments: [t.id],
            tooltip: 'Open task'
        };

        activeTasks.push(treeview);
    });
    return activeTasks;
}

function formatProjects(projects: project[]) {
    let displayProjects: todoistTreeView[] = [];
    projects = projects.sort((a, b) => a.order > b.order ? 1 : 0);
    projects.forEach(p => {
        let treeview = new todoistTreeView(p.name);
        treeview.id = p.id.toString();
        treeview.tooltip = p.name;
        treeview.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        treeview.project = p;
        treeview.iconPath = path.join(__filename, '..', '..', '..', 'media', 'colours', p.color.toString() + '.svg');
        treeview.contextValue = '';
        displayProjects.push(treeview);
    });
    return displayProjects;
}
