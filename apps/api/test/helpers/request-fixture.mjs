import 'reflect-metadata';
import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Post, Version } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

// Test-only routes: these are never registered by the production AppModule.
export class RequestDto { name; }
IsString()(RequestDto.prototype, 'name');
MinLength(3)(RequestDto.prototype, 'name');

export class RequestFixture {
  validate(body) { return { name: body.name, transformed: body instanceof RequestDto }; }
  clientError() { throw new BadRequestException('The request could not be accepted'); }
  unexpected() { throw new Error('PRIVATE_DATABASE_CREDENTIAL'); }
  serverError() { throw new InternalServerErrorException('PRIVATE_DATABASE_CREDENTIAL'); }
  versionTwo() { return { version: '2' }; }
}
Controller('foundation-test')(RequestFixture);
const prototype = RequestFixture.prototype;
Post('validate')(prototype, 'validate', Object.getOwnPropertyDescriptor(prototype, 'validate'));
Body()(prototype, 'validate', 0);
Reflect.defineMetadata('design:paramtypes', [RequestDto], prototype, 'validate');
for (const method of ['clientError', 'unexpected', 'serverError', 'versionTwo']) {
  Get(method)(prototype, method, Object.getOwnPropertyDescriptor(prototype, method));
}
Version('2')(prototype, 'versionTwo', Object.getOwnPropertyDescriptor(prototype, 'versionTwo'));
