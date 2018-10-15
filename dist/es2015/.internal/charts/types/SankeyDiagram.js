/**
 * Sankey diagram module.
 */
import * as tslib_1 from "tslib";
import { FlowDiagram, FlowDiagramDataItem } from "./FlowDiagram";
import { percent } from "../../core/utils/Percent";
import { registry } from "../../core/Registry";
import { SankeyNode } from "../elements/SankeyNode";
import { SankeyLink } from "../elements/SankeyLink";
import { Animation } from "../../core/utils/Animation";
import * as $iter from "../../core/utils/Iterator";
import * as $math from "../../core/utils/Math";
import * as $type from "../../core/utils/Type";
/**
 * ============================================================================
 * DATA ITEM
 * ============================================================================
 * @hidden
 */
//@todo rearange notes after dragged
/**
 * Defines a [[DataItem]] for [[SankeyDiagram]].
 *
 * @see {@link DataItem}
 */
var SankeyDiagramDataItem = /** @class */ (function (_super) {
    tslib_1.__extends(SankeyDiagramDataItem, _super);
    /**
     * Constructor
     */
    function SankeyDiagramDataItem() {
        var _this = _super.call(this) || this;
        _this.className = "SankeyDiagramDataItem";
        _this.applyTheme();
        return _this;
    }
    return SankeyDiagramDataItem;
}(FlowDiagramDataItem));
export { SankeyDiagramDataItem };
/**
 * ============================================================================
 * MAIN CLASS
 * ============================================================================
 * @hidden
 */
/**
 * Creates a Sankey Diagram chart.
 *
 * @see {@link ISankeyDiagramEvents} for a list of available Events
 * @see {@link ISankeyDiagramAdapters} for a list of available Adapters
 * @see {@link https://www.amcharts.com/docs/v4/chart-types/sankey-diagram/} for documentation
 * @important
 */
var SankeyDiagram = /** @class */ (function (_super) {
    tslib_1.__extends(SankeyDiagram, _super);
    /**
     * Constructor
     */
    function SankeyDiagram() {
        var _this = 
        // Init
        _super.call(this) || this;
        _this.className = "SankeyDiagram";
        _this.orientation = "horizontal";
        _this.nodeAlign = "middle";
        _this.nodesContainer.width = percent(100);
        _this.nodesContainer.height = percent(100);
        _this.linksContainer.width = percent(100);
        _this.linksContainer.height = percent(100);
        _this.events.on("maxsizechanged", function () {
            _this.invalidateDataRange();
        });
        // Apply theme
        _this.applyTheme();
        return _this;
    }
    /**
     * (Re)validates chart's data, effectively causing the chart to redraw.
     *
     * @ignore Exclude from docs
     */
    SankeyDiagram.prototype.validateData = function () {
        var _this = this;
        _super.prototype.validateData.call(this);
        this._levelCount = 0;
        this.nodes.each(function (key, node) {
            node.level = _this.getNodeLevel(node, 0);
            _this._levelCount = $math.max(_this._levelCount, node.level);
        });
    };
    /**
     * Returns node's highest level.
     *
     * @param  {SankeyNode}  node   Node
     * @param  {number}      level  Current level
     * @return {number}             New level
     */
    SankeyDiagram.prototype.getNodeLevel = function (node, level) {
        var _this = this;
        //@todo solve circular so
        var levels = [level];
        $iter.each(node.incomingDataItems.iterator(), function (link) {
            if (link.fromNode) {
                levels.push(_this.getNodeLevel(link.fromNode, level + 1));
            }
        });
        return Math.max.apply(Math, tslib_1.__spread(levels));
    };
    /**
     * Calculates relation between pixel height and total value.
     *
     * In Sankey the actual thickness of links and height of nodes will depend
     * on their values.
     */
    SankeyDiagram.prototype.calculateValueHeight = function () {
        var _this = this;
        // calculate sums of each level
        this._levelSum = {};
        this._levelNodesCount = {};
        this.maxSum = 0;
        var total = this.dataItem.values.value.sum;
        $iter.each(this._sorted, function (strNode) {
            var node = strNode[1];
            _this.getNodeValue(node);
        });
        this.nodes.each(function (key, node) {
            var level = node.level;
            var value = Math.max(node.totalIncoming, node.totalOutgoing);
            if (value / total < _this.minNodeSize) {
                value = total * _this.minNodeSize;
            }
            if ($type.isNumber(_this._levelSum[level])) {
                _this._levelSum[level] += value;
            }
            else {
                _this._levelSum[level] = value;
            }
            if ($type.isNumber(_this._levelNodesCount[level])) {
                _this._levelNodesCount[level]++;
            }
            else {
                _this._levelNodesCount[level] = 1;
            }
        });
        var maxSumLevel;
        for (var key in this._levelSum) {
            if (this.maxSum < this._levelSum[key]) {
                this.maxSum = this._levelSum[key];
                maxSumLevel = Number(key);
            }
        }
        this._maxSumLevel = maxSumLevel;
        var maxSumLevelNodeCount = this._levelNodesCount[this._maxSumLevel];
        var availableHeight;
        if (this.orientation == "horizontal") {
            availableHeight = this.chartContainer.maxHeight - 1;
        }
        else {
            availableHeight = this.chartContainer.maxWidth - 1;
        }
        var valueHeight = (availableHeight - (maxSumLevelNodeCount - 1) * this.nodePadding) / this.maxSum;
        if (!$type.isNumber(this.valueHeight)) {
            this.valueHeight = valueHeight;
        }
        else {
            var finalHeight = void 0;
            try {
                finalHeight = this._heightAnimation.animationOptions[0].to;
            }
            catch (err) {
            }
            // without animations it will be non-smooth as maxValue jumps from one column to another
            if (finalHeight != valueHeight) {
                var duration = this.interpolationDuration;
                try {
                    duration = this.nodes.template.states.getKey("active").transitionDuration;
                }
                catch (err) {
                }
                this._heightAnimation = new Animation(this, { property: "valueHeight", from: this.valueHeight, to: valueHeight }, duration).start();
                this._disposers.push(this._heightAnimation);
            }
        }
    };
    /**
     * Redraws the chart.
     *
     * @ignore Exclude from docs
     */
    SankeyDiagram.prototype.validate = function () {
        var _this = this;
        _super.prototype.validate.call(this);
        var container = this.nodesContainer;
        var nextCoordinate = {};
        var maxSumLevelNodeCount = this._levelNodesCount[this._maxSumLevel];
        var total = this.dataItem.values.value.sum;
        $iter.each(this._sorted, function (strNode) {
            var node = strNode[1];
            var level = node.level;
            var levelCoordinate = 0;
            var nodeCount = _this._levelNodesCount[level];
            switch (_this.nodeAlign) {
                case "bottom":
                    levelCoordinate = (_this.maxSum - _this._levelSum[level]) * _this.valueHeight - (nodeCount - maxSumLevelNodeCount) * _this.nodePadding;
                    break;
                case "middle":
                    levelCoordinate = (_this.maxSum - _this._levelSum[level]) * _this.valueHeight / 2 - (nodeCount - maxSumLevelNodeCount) * _this.nodePadding / 2;
                    break;
            }
            node.parent = container;
            var delta;
            var x;
            var y;
            var value = Math.max(node.totalIncoming, node.totalOutgoing);
            if (value / total < _this.minNodeSize) {
                value = total * _this.minNodeSize;
            }
            if (_this.orientation == "horizontal") {
                delta = (_this.pixelWidth - node.pixelWidth) / _this._levelCount;
                x = delta * node.level;
                y = nextCoordinate[level] || levelCoordinate;
                var h = value * _this.valueHeight;
                node.height = h;
                node.minX = x;
                node.maxX = x;
                nextCoordinate[level] = y + h + _this.nodePadding;
            }
            else {
                delta = (_this.pixelHeight - node.pixelHeight) / _this._levelCount;
                x = nextCoordinate[level] || levelCoordinate;
                y = delta * node.level;
                var w = value * _this.valueHeight;
                node.width = w;
                node.minY = y;
                node.maxY = y;
                nextCoordinate[level] = x + w + _this.nodePadding;
            }
            node.x = x;
            node.y = y;
        });
    };
    SankeyDiagram.prototype.validateDataRange = function () {
        _super.prototype.validateDataRange.call(this);
        this.calculateValueHeight();
    };
    /**
     * [appear description]
     *
     * @ignore Exclude from docs
     * @todo Description
     */
    SankeyDiagram.prototype.appear = function () {
        var _this = this;
        _super.prototype.appear.call(this);
        var container = this.nodesContainer;
        var i = 0;
        $iter.each(this.links.iterator(), function (link) {
            link.hide(0);
        });
        $iter.each(this._sorted, function (strNode) {
            var node = strNode[1];
            var property;
            if (_this.orientation == "horizontal") {
                node.dx = -(container.pixelWidth - node.pixelWidth) / _this._levelCount;
                property = "dx";
            }
            else {
                node.dy = -(container.pixelHeight - node.pixelHeight) / _this._levelCount;
                property = "dy";
            }
            var delay = 0;
            var duration = _this.interpolationDuration;
            if (_this.sequencedInterpolation) {
                delay = _this.sequencedInterpolationDelay * i + duration * i / $iter.length(_this.nodes.iterator());
            }
            node.opacity = 0;
            node.invalidateLinks();
            node.animate([{ property: "opacity", from: 0, to: 1 }, { property: property, to: 0 }], _this.interpolationDuration, _this.interpolationEasing).delay(delay);
            $iter.each(node.outgoingDataItems.iterator(), function (dataItem) {
                var animation = dataItem.link.show(_this.interpolationDuration);
                if (animation && !animation.isDisposed()) {
                    animation.delay(delay);
                }
            });
            $iter.each(node.incomingDataItems.iterator(), function (dataItem) {
                if (!dataItem.fromNode) {
                    var animation = dataItem.link.show(_this.interpolationDuration);
                    if (animation && !animation.isDisposed()) {
                        animation.delay(delay);
                    }
                }
            });
            i++;
        });
    };
    /**
     * Changes the sort type of the nodes.
     *
     * This will actually reshuffle nodes using nice animation.
     */
    SankeyDiagram.prototype.changeSorting = function () {
        var _this = this;
        this.sortNodes();
        var nextCoordinate = {};
        $iter.each(this._sorted, function (strNode) {
            var node = strNode[1];
            var level = node.level;
            var levelCoordinate = (_this.maxSum - _this._levelSum[level]) * _this.valueHeight / 2;
            var property;
            var nodeHeight;
            if (_this.orientation == "horizontal") {
                property = "y";
                nodeHeight = node.pixelHeight;
            }
            else {
                property = "x";
                nodeHeight = node.pixelWidth;
            }
            node.animate({ property: property, to: nextCoordinate[level] || levelCoordinate }, _this.interpolationDuration, _this.interpolationEasing);
            nextCoordinate[level] = (nextCoordinate[level] || levelCoordinate) + nodeHeight + _this.nodePadding;
            node.invalidateLinks();
        });
    };
    /**
     * Sets defaults that instantiate some objects that rely on parent, so they
     * cannot be set in constructor.
     */
    SankeyDiagram.prototype.applyInternalDefaults = function () {
        _super.prototype.applyInternalDefaults.call(this);
        // Add a default screen reader title for accessibility
        // This will be overridden in screen reader if there are any `titles` set
        if (!$type.hasValue(this.readerTitle)) {
            this.readerTitle = this.language.translate("Sankey diagram");
        }
    };
    /**
     * Creates and returns a new data item.
     *
     * @return {this} Data item
     */
    SankeyDiagram.prototype.createDataItem = function () {
        return new SankeyDiagramDataItem();
    };
    Object.defineProperty(SankeyDiagram.prototype, "nodeAlign", {
        /**
         * @returns {"top" | "middle" | "bottom"} Returns nodeAlign value
         */
        get: function () {
            return this.getPropertyValue("nodeAlign");
        },
        /**
         * How to align nodes. In case layout is vertical, top means left and bottom means right
         *
         * @param {"top" | "middle" | "bottom"}  value  Node sorting
         */
        set: function (value) {
            this.setPropertyValue("nodeAlign", value);
            this.changeSorting();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SankeyDiagram.prototype, "orientation", {
        /**
         * @return {Orientation} Orientation
         */
        get: function () {
            return this.getPropertyValue("orientation");
        },
        /**
         * Orientation of the chart: "horizontal" or "vertical";
         *
         * @param {Orientation} value Orientation
         */
        set: function (value) {
            this.setPropertyValue("orientation", value, true);
            var nameLabel = this.nodes.template.nameLabel;
            if (value == "vertical") {
                this.nodes.template.width = undefined;
                nameLabel.label.horizontalCenter = "middle";
                nameLabel.locationX = 0.5;
            }
            else {
                this.nodes.template.height = undefined;
                nameLabel.label.horizontalCenter = "left";
                nameLabel.locationX = 1;
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @ignore
     */
    SankeyDiagram.prototype.createNode = function () {
        var node = new SankeyNode();
        this._disposers.push(node);
        return node;
    };
    /**
     * @ignore
     */
    SankeyDiagram.prototype.createLink = function () {
        var link = new SankeyLink();
        this._disposers.push(link);
        return link;
    };
    Object.defineProperty(SankeyDiagram.prototype, "valueHeight", {
        get: function () {
            return this._valueHeight;
        },
        set: function (value) {
            if (value != this._valueHeight) {
                this._valueHeight = value;
                this.invalidateDataRange();
            }
        },
        enumerable: true,
        configurable: true
    });
    return SankeyDiagram;
}(FlowDiagram));
export { SankeyDiagram };
/**
 * Register class in system, so that it can be instantiated using its name from
 * anywhere.
 *
 * @ignore
 */
registry.registeredClasses["SankeyDiagram"] = SankeyDiagram;
//# sourceMappingURL=SankeyDiagram.js.map