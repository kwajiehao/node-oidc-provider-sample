export const placeholderFunc = (...args: any[]) => {
    console.log(args, args)
}

export const authorizationErrorCallback = (_ctx: any, error: any) => {
    console.log(_ctx, 'Context')
    console.log(error, "Authorization error")
}

export const interactionStartedCallback = (ctx: any, prompt: any) => {
    console.log(ctx, 'Context')
    console.log(prompt, "Prompt for start of interaction")
}

export const serverErrorCallback = (_ctx: any, error: any) => {
    console.log(_ctx, 'Context')
    console.log(error, "Server error")
}