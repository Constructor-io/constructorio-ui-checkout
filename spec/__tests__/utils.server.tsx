import { renderToString } from 'react-dom/server';
import type { Mock } from 'vitest';

interface RenderHookServerSideWrapperProps<TProps extends object, TResult> {
  renderCallback: (props: TProps) => TResult;
  renderCallbackProps: { initialProps: TProps };
  onRenderHookValue: (result: TResult) => void;
}

function RenderHookServerSideWrapper<TProps extends object, TResult>({
  renderCallback,
  renderCallbackProps,
  onRenderHookValue,
}: RenderHookServerSideWrapperProps<TProps, TResult>): null {
  const utils = renderCallback(renderCallbackProps.initialProps);
  onRenderHookValue(utils);
  return null;
}

interface RenderHookServerSideResult<TResult> {
  view: string;
  onRenderHookValue: Mock;
  result: TResult;
}

export function renderHookServerSide<TProps extends object, TResult>(
  renderCallback: (props: TProps) => TResult,
  renderCallbackProps: { initialProps: TProps },
  onRenderHookValue: Mock = vi.fn()
): RenderHookServerSideResult<TResult> {
  const view = renderToString(
    <RenderHookServerSideWrapper<TProps, TResult>
      renderCallback={renderCallback}
      renderCallbackProps={renderCallbackProps}
      onRenderHookValue={onRenderHookValue}
    />
  );

  return {
    view,
    onRenderHookValue,
    result: onRenderHookValue.mock.calls[0]?.[0] as TResult,
  };
}
