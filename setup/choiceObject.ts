import inquirer from "inquirer";

export default async function choiceObject<T>(objects: T[], print: (obj: T) => string, message: string): Promise<T> {
    const labels = objects.map(print)
    return new Promise(resolve => {
        inquirer.prompt([
            {
                name: "object",
                type: "list",
                message: message,
                choices: () => labels
            }
        ]).then(answers => resolve(objects[labels.indexOf(answers.object)]))
    })
}