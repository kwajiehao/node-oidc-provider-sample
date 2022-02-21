export class BaseModel {
    create(obj: { [key: string]: any }): this {
      return Object.assign(this, obj)
    }
}
  