/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

export interface AttributesMap {
  [key: string]: string | null;
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export const getElementPositionAndAttributes = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  layout: Layout
): Promise<ElementsPositionAndAttribute[] | null> => {
  const span = apm.startSpan('get_element_position_data', 'read');
  const { screenshot: screenshotSelector } = layout.selectors; // data-shared-items-container
  let elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  try {
    elementsPositionAndAttributes = await browser.evaluate(
      {
        fn: (selector, attributes) => {
          const elements = Array.from(document.querySelectorAll<Element>(selector));
          const results: ElementsPositionAndAttribute[] = [];

          for (const element of elements) {
            const boundingClientRect = element.getBoundingClientRect() as DOMRect;
            results.push({
              position: {
                boundingClientRect: {
                  // modern browsers support x/y, but older ones don't
                  top: boundingClientRect.y || boundingClientRect.top,
                  left: boundingClientRect.x || boundingClientRect.left,
                  width: boundingClientRect.width,
                  height: boundingClientRect.height,
                },
                scroll: {
                  x: window.scrollX,
                  y: window.scrollY,
                },
              },
              attributes: Object.keys(attributes).reduce((result: AttributesMap, key) => {
                const attribute = attributes[key];
                result[key] = element.getAttribute(attribute);
                return result;
              }, {} as AttributesMap),
            });
          }
          return results;
        },
        args: [screenshotSelector, { title: 'data-title', description: 'data-description' }],
      },
      { context: CONTEXT_ELEMENTATTRIBUTES },
      logger
    );

    if (!elementsPositionAndAttributes?.length) {
      throw new Error(
        `An error occurred while reading the page for visualization panels: no panels were found.`
      );
    }
  } catch (err) {
    elementsPositionAndAttributes = null;
  }

  span?.end();

  return elementsPositionAndAttributes;
};
