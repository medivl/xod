import * as R from 'ramda';
import React from 'react';
import { HotKeys } from 'react-hotkeys';

import * as XP from 'xod-project';

import { EDITOR_MODE, SELECTION_ENTITY_TYPE } from '../../../constants';
import { isEntitySelected } from '../../../utils';
import { isInputTarget } from '../../../../utils/browser';
import { COMMAND } from '../../../../utils/constants';

import PatchSVG from '../../../../project/components/PatchSVG';
import * as Layers from '../../../../project/components/layers';

import { snapPositionToSlots } from '../../../../project/nodeLayout';

import {
  bindApi,
  getMousePosition,
  getOffsetMatrix,
  isMiddleButtonPressed,
} from '../modeUtils';

const isSelectionModifierPressed = event => event.metaKey || event.ctrlKey;

const selectingMode = {
  getInitialState() {
    return {
      isMouseDownOnBackground: false,
      isMouseDownOnMovableObject: false,
      dragStartPosition: { x: 0, y: 0 },
      mouseDownPosition: { x: 0, y: 0 },
    };
  },

  onEntityMouseDown(api, entityType, event, entityId) {
    if (isMiddleButtonPressed(event)) return;
    const patchSvgRef = api.getStorage().patchSvgRef;
    const mousePosition = getMousePosition(patchSvgRef, api.getOffset(), event);

    if (isEntitySelected(entityType, api.props.selection, entityId)) {
      if (isSelectionModifierPressed(event)) {
        api.props.actions.deselectEntity(entityType, entityId);
        api.setState({ isMouseDownOnMovableObject: false });
      } else {
        // Don't set selection to this single entity
        // to allow user to move already selected group of entities.
        // We'll handle it in `onEntityMouseUp`
        api.setState({
          isMouseDownOnMovableObject: true,
          dragStartPosition: mousePosition,
        });
      }
    } else if (isSelectionModifierPressed(event)) {
      api.props.actions.addEntityToSelection(entityType, entityId);
      api.setState({
        isMouseDownOnMovableObject: true,
        dragStartPosition: mousePosition,
      });
    } else {
      api.props.actions.selectEntity(entityType, entityId);
      api.setState({
        isMouseDownOnMovableObject: true,
        dragStartPosition: mousePosition,
      });
    }
  },
  onEntityMouseUp({ props, setState }, entityType, event, entityId) {
    if (isMiddleButtonPressed(event)) return;

    if (
      !isSelectionModifierPressed(event) &&
      isEntitySelected(entityType, props.selection, entityId) &&
      props.selection.length > 1
    ) {
      props.actions.selectEntity(entityType, entityId);
    }

    setState({ isMouseDownOnMovableObject: false });
  },

  onCommentResizeHandleMouseDown(api, event, commentId) {
    if (isMiddleButtonPressed(event)) return;

    api.goToMode(EDITOR_MODE.RESIZING_COMMENT, {
      resizedCommentId: commentId,
      dragStartPosition: getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      ),
    });
  },
  onNodeResizeHandleMouseDown(api, event, nodeId) {
    if (isMiddleButtonPressed(event)) return;

    api.goToMode(EDITOR_MODE.RESIZING_NODE, {
      resizedNodeId: nodeId,
      dragStartPosition: getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      ),
    });
  },
  onVariadicHandleDown(api, event, nodeId) {
    if (isMiddleButtonPressed(event)) return;

    api.goToMode(EDITOR_MODE.CHANGING_ARITY_LEVEL, {
      nodeId,
      dragStartPosition: getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      ),
    });
  },
  onPinMouseDown(api, event, nodeId, pinKey) {
    if (isMiddleButtonPressed(event)) return;

    const didSelectPin = api.props.actions.doPinSelection(nodeId, pinKey);
    if (didSelectPin) {
      const mousePosition = getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      );
      api.goToMode(EDITOR_MODE.LINKING, { mousePosition });
    }
  },
  onLinkClick({ props }, event, linkId) {
    const { LINK } = SELECTION_ENTITY_TYPE;

    if (isSelectionModifierPressed(event)) {
      if (isEntitySelected(LINK, props.selection, linkId)) {
        props.actions.deselectEntity(LINK, linkId);
      } else {
        props.actions.addEntityToSelection(LINK, linkId);
      }
    } else {
      props.actions.selectEntity(LINK, linkId);
    }
  },
  onMouseDown(api, event) {
    const mousePosition = getMousePosition(
      api.getStorage().patchSvgRef,
      api.getOffset(),
      event
    );
    if (!isMiddleButtonPressed(event)) return;

    api.goToMode(EDITOR_MODE.PANNING, {
      isPanning: true,
      panningStartPosition: mousePosition,
    });
  },
  onMouseMove(api, event) {
    if (api.state.isMouseDownOnBackground) {
      api.goToMode(EDITOR_MODE.MARQUEE_SELECTING, {
        mouseStartPosition: api.state.mouseDownPosition,
        mousePosition: getMousePosition(
          api.getStorage().patchSvgRef,
          api.getOffset(),
          event
        ),
      });
    }

    if (!api.state.isMouseDownOnMovableObject) return;

    api.goToMode(EDITOR_MODE.MOVING_SELECTION, {
      dragStartPosition: api.state.dragStartPosition,
      mousePosition: getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      ),
    });
  },
  onMouseUp(api) {
    api.setState({
      isMouseDownOnBackground: false,
      isMouseDownOnMovableObject: false,
      mouseDownPosition: { x: 0, y: 0 },
    });
  },
  onKeyDown(api, event) {
    if (isInputTarget(event)) return;

    if (event.key === ' ' && !api.state.isMouseDownOnMovableObject) {
      api.goToMode(EDITOR_MODE.PANNING, { isPanning: false });
    }
  },
  onDeleteSelection(api, event) {
    if (isInputTarget(event)) return;

    api.props.actions.deleteSelection();
  },
  onSelectAll({ props }, event) {
    if (isInputTarget(event)) return;

    event.preventDefault();

    props.actions.setSelection(
      R.compose(R.map(R.values), R.pick(['nodes', 'links', 'comments']))(props)
    );
  },
  onBackgroundClick(api, event) {
    // to prevent misclicks when selecting multiple entities
    if (isSelectionModifierPressed(event)) return;

    api.props.actions.deselectAll();
  },
  onBackgroundDoubleClick(api, event) {
    R.compose(api.props.onDoubleClick, snapPositionToSlots, getMousePosition)(
      api.getStorage().patchSvgRef,
      api.getOffset(),
      event
    );
  },
  onBackgroundMouseDown(api, event) {
    api.setState({
      mouseDownPosition: getMousePosition(
        api.getStorage().patchSvgRef,
        api.getOffset(),
        event
      ),
      isMouseDownOnBackground: true,
    });
  },
  onNodeDoubleClick(api, nodeId, patchPath) {
    if (patchPath === XP.NOT_IMPLEMENTED_IN_XOD_PATH) {
      api.props.actions.openImplementationEditor();
    } else {
      api.props.actions.switchPatch(patchPath);
    }
  },
  onSplitLinksToBuses(api, event) {
    if (isInputTarget(event)) return;

    api.props.actions.splitLinksToBuses();
  },
  getHotkeyHandlers(api) {
    return {
      [COMMAND.SELECT_ALL]: bindApi(api, this.onSelectAll),
      [COMMAND.DELETE_SELECTION]: bindApi(api, this.onDeleteSelection),
      [COMMAND.DESELECT]: api.props.actions.deselectAll,
      [COMMAND.MAKE_BUS]: bindApi(api, this.onSplitLinksToBuses),
    };
  },
  render(api) {
    return (
      <HotKeys
        handlers={this.getHotkeyHandlers(api)}
        className="PatchWrapper"
        onKeyDown={bindApi(api, this.onKeyDown)}
      >
        <PatchSVG
          onMouseDown={bindApi(api, this.onMouseDown)}
          onMouseMove={bindApi(api, this.onMouseMove)}
          onMouseUp={bindApi(api, this.onMouseUp)}
          svgRef={svg => api.setStorage({ patchSvgRef: svg })}
        >
          <Layers.Background
            width={api.props.size.width}
            height={api.props.size.height}
            onClick={bindApi(api, this.onBackgroundClick)}
            onDoubleClick={bindApi(api, this.onBackgroundDoubleClick)}
            onMouseDown={bindApi(api, this.onBackgroundMouseDown)}
            offset={api.getOffset()}
          />
          <g transform={getOffsetMatrix(api.getOffset())}>
            <Layers.Comments
              comments={api.props.comments}
              selection={api.props.selection}
              onMouseDown={R.partial(this.onEntityMouseDown, [
                api,
                SELECTION_ENTITY_TYPE.COMMENT,
              ])}
              onMouseUp={R.partial(this.onEntityMouseUp, [
                api,
                SELECTION_ENTITY_TYPE.COMMENT,
              ])}
              onResizeHandleMouseDown={bindApi(
                api,
                this.onCommentResizeHandleMouseDown
              )}
              onFinishEditing={api.props.actions.editComment}
            />
            <Layers.Links
              links={api.props.links}
              selection={api.props.selection}
            />
            <Layers.Nodes
              nodes={api.props.nodes}
              selection={api.props.selection}
              linkingPin={api.props.linkingPin}
              onMouseDown={R.partial(this.onEntityMouseDown, [
                api,
                SELECTION_ENTITY_TYPE.NODE,
              ])}
              onMouseUp={R.partial(this.onEntityMouseUp, [
                api,
                SELECTION_ENTITY_TYPE.NODE,
              ])}
              onDoubleClick={bindApi(api, this.onNodeDoubleClick)}
              onVariadicHandleDown={bindApi(api, this.onVariadicHandleDown)}
              onResizeHandleMouseDown={bindApi(
                api,
                this.onNodeResizeHandleMouseDown
              )}
            />
            <Layers.LinksOverlay
              links={api.props.links}
              selection={api.props.selection}
              onClick={bindApi(api, this.onLinkClick)}
            />
            <Layers.NodePinsOverlay
              nodes={api.props.nodes}
              linkingPin={api.props.linkingPin}
              onPinMouseDown={bindApi(api, this.onPinMouseDown)}
            />
          </g>
        </PatchSVG>
      </HotKeys>
    );
  },
};

export default selectingMode;
