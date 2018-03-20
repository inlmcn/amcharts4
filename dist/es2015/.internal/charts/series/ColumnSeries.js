/**
 * Column series module.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * ============================================================================
 * IMPORTS
 * ============================================================================
 * @hidden
 */
import { XYSeries, XYSeriesDataItem } from "./XYSeries";
import { visualProperties } from "../../core/Sprite";
import { Container } from "../../core/Container";
import { ListTemplate } from "../../core/utils/List";
import { Dictionary } from "../../core/utils/Dictionary";
import { ValueAxis } from "../axes/ValueAxis";
import { system } from "../../core/System";
import { RoundedRectangle } from "../../core/elements/RoundedRectangle";
import * as $math from "../../core/utils/Math";
import * as $object from "../../core/utils/Object";
import * as $iter from "../../core/utils/Iterator";
import * as $array from "../../core/utils/Array";
import * as $type from "../../core/utils/Type";
import { percent } from "../../core/utils/Percent";
/**
 * ============================================================================
 * DATA ITEM
 * ============================================================================
 * @hidden
 */
/**
 * Defines a [[DataItem]] for [[ColumnSeries]].
 *
 * @see {@link DataItem}
 */
var ColumnSeriesDataItem = /** @class */ (function (_super) {
    __extends(ColumnSeriesDataItem, _super);
    /**
     * Constructor
     */
    function ColumnSeriesDataItem() {
        var _this = _super.call(this) || this;
        _this.className = "ColumnSeriesDataItem";
        _this.locations["dateX"] = 0.5;
        _this.locations["dateY"] = 0.5;
        _this.locations["categoryX"] = 0.5;
        _this.locations["categoryY"] = 0.5;
        _this.applyTheme();
        return _this;
    }
    Object.defineProperty(ColumnSeriesDataItem.prototype, "column", {
        /**
         * @return {Sprite} Column sprite
         */
        get: function () {
            return this._column;
        },
        /**
         * A column sprite used to draw a column for this data item.
         *
         * For performance sake, column sprites are reused, hence the necessity
         * of this property.
         *
         * @param {Sprite}  column  Column sprite
         */
        set: function (column) {
            if (this._column) {
                $array.remove(this.sprites, this._column);
            }
            this._column = column;
            if (column) {
                var prevDataItem = column.dataItem;
                if (prevDataItem && prevDataItem != this) {
                    prevDataItem.column = undefined;
                }
                this.addSprite(column);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColumnSeriesDataItem.prototype, "rangesColumns", {
        /**
         * A dictionary storing axes ranges columns by axis uid
         *
         * @type {Dictionary<string, Sprite>}
         */
        get: function () {
            if (!this._rangesColumns) {
                this._rangesColumns = new Dictionary();
            }
            return this._rangesColumns;
        },
        enumerable: true,
        configurable: true
    });
    return ColumnSeriesDataItem;
}(XYSeriesDataItem));
export { ColumnSeriesDataItem };
/**
 * ============================================================================
 * MAIN CLASS
 * ============================================================================
 * @hidden
 */
/**
 * Defines [[Series]] for a column graph.
 *
 * @see {@link IColumnSeriesEvents} for a list of available Events
 * @see {@link IColumnSeriesAdapters} for a list of available Adapters
 * @todo Example
 * @important
 */
var ColumnSeries = /** @class */ (function (_super) {
    __extends(ColumnSeries, _super);
    /**
     * Constructor
     */
    function ColumnSeries() {
        var _this = _super.call(this) || this;
        /**
         * Start location within cell for columns.
         *
         * @type {number}
         */
        _this._startLocation = 0;
        /**
         * End location within cell for columns.
         *
         * @type {number}
         */
        _this._endLocation = 1;
        /**
         * When working value of dataItem changes, we must process all the values to calculate sum, min, max etc. Also update stack values. This is quite expensive operation.
         * Unfortunately we do not know if user needs this processed values or not. By setting simplifiedProcessing = true you disable this processing and in case working
         * value changes, we only redraw the particular column. Do not do this if you have staked chart or use calculated values in bullets or in tooltips.
         *
         * @type {boolean}
         */
        _this.simplifiedProcessing = false;
        _this.className = "ColumnSeries";
        _this.width = percent(100);
        _this.height = percent(100);
        _this.strokeOpacity = 0;
        _this.fillOpacity = 1;
        _this.clustered = true;
        _this._columnsContainer = _this.mainContainer.createChild(Container);
        _this._columnsContainer.isMeasured = false;
        _this._columnsContainer.noLayouting = true;
        _this.columns;
        _this.columns.template.pixelPerfect = false;
        _this.applyTheme();
        return _this;
    }
    Object.defineProperty(ColumnSeries.prototype, "columnsContainer", {
        /**
         * A container that columns are created in.
         *
         * @ignore Exclude from docs
         */
        get: function () {
            return this._columnsContainer;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Sets defaults that instantiate some objects that rely on parent, so they
     * cannot be set in constructor.
     */
    ColumnSeries.prototype.applyInternalDefaults = function () {
        _super.prototype.applyInternalDefaults.call(this);
        this.readerTitle = this.language.translate("Column Series");
    };
    /**
     * Returns a new/empty DataItem of the type appropriate for this object.
     *
     * @see {@link DataItem}
     * @return {ColumnSeriesDataItem} Data Item
     */
    ColumnSeries.prototype.createDataItem = function () {
        return new ColumnSeriesDataItem();
    };
    /**
     * (Re)validates the whole series, effectively causing it to redraw.
     *
     * @ignore Exclude from docs
     */
    ColumnSeries.prototype.validate = function () {
        //@todo Check if we can do better than use `instanceof`
        var _this = this;
        // find start/end locations based on clustered/stacked settings
        // go through chart series instead of base axis series, because axis series doesn't maintain order
        var baseAxisSeries = this.chart.series;
        var clusterCount = 0;
        var index = 0;
        $iter.each(baseAxisSeries.iterator(), function (series) {
            if (series instanceof ColumnSeries) {
                if (_this.baseAxis == series.baseAxis) {
                    if ((!series.stacked && series.clustered) || series.newStack || clusterCount === 0) {
                        clusterCount++;
                    }
                    if (series == _this) {
                        index = clusterCount - 1;
                    }
                }
            }
        });
        var renderer = this.baseAxis.renderer;
        var cellStartLocation = renderer.cellStartLocation;
        var cellEndLocation = renderer.cellEndLocation;
        this._startLocation = cellStartLocation + (index / clusterCount) * (cellEndLocation - cellStartLocation);
        this._endLocation = cellStartLocation + (index + 1) / clusterCount * (cellEndLocation - cellStartLocation);
        // can't use columnsContainer.removeChildren() because with 3d columns we use one container for all columns
        $iter.each(this.columns.iterator(), function (column) {
            column.__disabled = true;
        });
        this._columnsIterator.reset();
        _super.prototype.validate.call(this);
    };
    /**
     * Validates data item's element, effectively redrawing it.
     *
     * @ignore Exclude from docs
     * @param {ColumnSeriesDataItem}  dataItem  Data item
     */
    ColumnSeries.prototype.validateDataElement = function (dataItem) {
        // important oder here, first real, then super. we need this to know size
        this.validateDataElementReal(dataItem);
        _super.prototype.validateDataElement.call(this, dataItem);
    };
    /**
     * Returns relative start location for the data item.
     *
     * @param  {this["_dataItem"]}  dataItem  Data item
     * @return {number}                       Location (0-1)
     */
    ColumnSeries.prototype.getStartLocation = function (dataItem) {
        var startLocation = this._startLocation;
        if (this.baseAxis == this.xAxis) {
            startLocation += dataItem.locations[this.xOpenField] - 0.5;
        }
        else {
            startLocation += dataItem.locations[this.yOpenField] - 0.5;
        }
        return startLocation;
    };
    ColumnSeries.prototype.handleDataItemWorkingValueChange = function (event) {
        if (this.simplifiedProcessing) {
            this.validateDataElement(event.target);
        }
        else {
            _super.prototype.handleDataItemWorkingValueChange.call(this, event);
        }
    };
    /**
     * Returns relative end location for the data item.
     *
     * @param  {this["_dataItem"]}  dataItem  Data item
     * @return {number}                       Location (0-1)
     */
    ColumnSeries.prototype.getEndLocation = function (dataItem) {
        var endLocation = this._endLocation;
        if (this.baseAxis == this.xAxis) {
            endLocation += dataItem.locations[this.xField] - 0.5;
        }
        else {
            endLocation += dataItem.locations[this.yField] - 0.5;
        }
        return endLocation;
    };
    /**
     * Validates data item's elements.
     *
     * @ignore Exclude from docs
     * @param {this["_dataItem"]}  dataItem  Data item
     */
    ColumnSeries.prototype.validateDataElementReal = function (dataItem) {
        var _this = this;
        //	if (dataItem.hasValue([this.xField, this.yField])) { // todo: this doesn't work with categories, think of a better way
        var l;
        var r;
        var t;
        var b;
        var startLocation = this.getStartLocation(dataItem);
        var endLocation = this.getEndLocation(dataItem);
        var xField = this.xField;
        var xOpenField = this.xOpenField;
        var yField = this.yField;
        var yOpenField = this.yOpenField;
        var template = this.columns.template;
        var percentWidth = template.percentWidth;
        var percentHeight = template.percentHeight;
        var pixelWidth = template.pixelWidth;
        var pixelHeight = template.pixelHeight;
        // vertical columns
        if (this.baseAxis == this.xAxis) {
            // in case width is set in percent
            if (!$type.isNaN(percentWidth)) {
                var offset = $math.round((endLocation - startLocation) * (1 - percentWidth / 100) / 2, 5);
                startLocation += offset;
                endLocation -= offset;
            }
            l = this.xAxis.getX(dataItem, xOpenField, startLocation);
            r = this.xAxis.getX(dataItem, xField, endLocation);
            // in case width is set in pixels
            if ($type.isNaN(percentWidth)) {
                var offset = ((r - l) - pixelWidth) / 2;
                l += offset;
                r -= offset;
            }
            var bottomLocation = dataItem.locations[yOpenField];
            var topLocation = dataItem.locations[yField];
            // otherwise gantt chart will start items in the middle of a cell
            if (this.yAxis instanceof ValueAxis) {
                bottomLocation = 0;
                topLocation = 0;
            }
            b = this.yAxis.getY(dataItem, yOpenField, bottomLocation);
            t = this.yAxis.getY(dataItem, yField, topLocation);
            // used to save location for bullets, but it's not a good approach
            // dataItem.locations[xField] = startLocation + (endLocation - startLocation) / 2;
        }
        else {
            if (!$type.isNaN(percentHeight)) {
                var offset = $math.round((1 - percentHeight / 100) / 2, 5);
                startLocation += offset;
                endLocation -= offset;
            }
            t = this.yAxis.getY(dataItem, yOpenField, startLocation);
            b = this.yAxis.getY(dataItem, yField, endLocation);
            // in case width is set in pixels
            if ($type.isNaN(percentHeight)) {
                var offset = ((b - t) - pixelHeight) / 2;
                b += offset;
                t -= offset;
            }
            var rightLocation = dataItem.locations[xField];
            var leftLocation = dataItem.locations[xOpenField];
            // otherwise gantt chart will start items in the middle of a cell
            if (this.xAxis instanceof ValueAxis) {
                rightLocation = 0;
                leftLocation = 0;
            }
            r = this.xAxis.getX(dataItem, xField, rightLocation);
            l = this.xAxis.getX(dataItem, xOpenField, leftLocation);
            // used to save location for bullets, but it's not a good approach
            // dataItem.locations[yField] = startLocation + (endLocation - startLocation) / 2;
        }
        var paddingLeft = template.pixelPaddingLeft;
        var paddingRight = template.pixelPaddingRight;
        var paddingTop = template.pixelPaddingTop;
        var paddingBottom = template.pixelPaddingBottom;
        var minY = -paddingTop;
        var maxY = this.yAxis.axisLength + paddingBottom;
        var minX = -paddingLeft;
        var maxX = this.xAxis.axisLength + paddingRight;
        b = $math.fitToRange(b, minY, maxY);
        t = $math.fitToRange(t, minY, maxY);
        l = $math.fitToRange(l, minX, maxX);
        r = $math.fitToRange(r, minX, maxX);
        var w = Math.abs(r - l);
        var h = Math.abs(b - t);
        var x = Math.min(l, r);
        var y = Math.min(t, b);
        if (w - paddingLeft - paddingRight > 0 && h - paddingTop - paddingBottom > 0) {
            var column = void 0;
            if (!dataItem.column) {
                column = this._columnsIterator.getFirst();
                if (column.dataItem != dataItem) {
                    $object.forceCopyProperties(this.columns.template, column, visualProperties);
                    $object.copyProperties(this, column, visualProperties); // need this because 3d columns are not in the same container
                    $object.copyProperties(this.columns.template, column, visualProperties); // second time, no force, so that columns.template would override series properties
                    column.dataItem = dataItem;
                    this.setColumnStates(column);
                }
                dataItem.column = column;
            }
            else {
                column = dataItem.column;
            }
            column.width = w;
            column.height = h;
            column.x = x;
            column.y = y;
            column.parent = this.columnsContainer;
            if (column.invalid) {
                column.validate(); // validate as if it was used previously, it will flicker with previous dimensions
            }
            column.__disabled = false;
            $iter.each(this.axisRanges.iterator(), function (axisRange) {
                var rangeColumn = dataItem.rangesColumns.getKey(axisRange.uid);
                if (!rangeColumn) {
                    rangeColumn = _this._columnsIterator.getFirst();
                    if (rangeColumn.dataItem != dataItem) {
                        $object.forceCopyProperties(_this.columns.template, rangeColumn, visualProperties);
                        $object.copyProperties(axisRange.contents, rangeColumn, visualProperties); // need this because 3d columns are not in the same container
                        if (rangeColumn.dataItem) {
                            $array.remove(rangeColumn.dataItem.sprites, rangeColumn);
                        }
                        dataItem.addSprite(rangeColumn);
                        _this.setColumnStates(rangeColumn);
                    }
                    dataItem.rangesColumns.setKey(axisRange.uid, rangeColumn);
                }
                rangeColumn.parent = axisRange.contents;
                rangeColumn.width = w;
                rangeColumn.height = h;
                rangeColumn.x = x;
                rangeColumn.y = y;
                if (rangeColumn.invalid) {
                    rangeColumn.validate(); // validate as if it was used previously, it will flicker with previous dimensions
                }
                rangeColumn.__disabled = false;
            });
        }
        else {
            if (dataItem.column) {
                dataItem.column.__disabled = true;
            }
            $iter.each(this.axisRanges.iterator(), function (axisRange) {
                var rangeColumn = dataItem.rangesColumns.getKey(axisRange.uid);
                if (rangeColumn) {
                    rangeColumn.__disabled = true;
                }
            });
        }
        dataItem.itemWidth = w;
        dataItem.itemHeight = h;
    };
    /**
     * Apply different state/coloring to columns based on the change value.
     *
     * @param {Sprite}  sprite  Sprite to apply state to
     * @todo Do not apply accessibility to wicks of the candlesticks
     */
    ColumnSeries.prototype.setColumnStates = function (sprite) {
        var _this = this;
        var dataItem = sprite.dataItem;
        if (this.xAxis instanceof ValueAxis || this.yAxis instanceof ValueAxis) {
            var open_1;
            var value = void 0;
            var change = void 0;
            if (this.baseAxis == this.yAxis) {
                open_1 = dataItem.getValue(this.xOpenField);
                value = dataItem.getValue(this.xField);
                change = dataItem.getValue(this.xAxis.axisFieldName + "X", "previousChange");
            }
            else {
                open_1 = dataItem.getValue(this.yOpenField);
                value = dataItem.getValue(this.yField);
                change = dataItem.getValue(this.yAxis.axisFieldName + "Y", "previousChange");
            }
            if (value < open_1) {
                dataItem.droppedFromOpen = true;
                sprite.setState(this._dropFromOpenState, 0);
            }
            else {
                dataItem.droppedFromOpen = false;
                sprite.setState(this._riseFromOpenState, 0);
            }
            if (change < 0) {
                dataItem.droppedFromPrevious = true;
                sprite.setState((this._dropFromPreviousState), 0);
            }
            else {
                dataItem.droppedFromPrevious = false;
                sprite.setState((this._riseFromPreviousState), 0);
            }
        }
        // Set accessibility
        if (!this.isInTransition()) {
            if (this.itemsFocusable()) {
                sprite.role = "menuitem";
                sprite.focusable = true;
            }
            else {
                sprite.role = "listitem";
                sprite.focusable = false;
            }
            // Set readerTitle on demand only (focus or hover)
            if ($type.hasValue(this.itemReaderText) && this.itemReaderText != "") {
                if (sprite.focusable) {
                    sprite.events.once("focus", function (ev) {
                        sprite.readerTitle = _this.populateString(_this.itemReaderText, dataItem);
                    });
                    sprite.events.once("blur", function (ev) {
                        sprite.readerTitle = "";
                    });
                }
                if (sprite.hoverable) {
                    sprite.events.once("over", function (ev) {
                        sprite.readerTitle = _this.populateString(_this.itemReaderText, dataItem);
                    });
                    sprite.events.once("out", function (ev) {
                        sprite.readerTitle = "";
                    });
                }
            }
        }
    };
    Object.defineProperty(ColumnSeries.prototype, "columns", {
        /**
         * A list of column elements.
         *
         * @ignore Exclude from docs
         * @return {ListTemplate<Sprite>} Columns
         */
        get: function () {
            var _this = this;
            if (!this._columns) {
                var columnTemplate = this.getColumnTemplate();
                columnTemplate.isMeasured = false;
                this._columns = new ListTemplate(columnTemplate);
                this._columnsIterator = new $iter.ListIterator(this._columns, function () { return _this._columns.create(); });
                this._columnsIterator.createNewItems = true;
            }
            return this._columns;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Creates and returns a column element to use as a template.
     *
     * @return {Sprite} Column template
     */
    ColumnSeries.prototype.getColumnTemplate = function () {
        var columnTemplate = new RoundedRectangle();
        columnTemplate.cornerRadius(0, 0, 0, 0);
        columnTemplate.width = percent(80);
        columnTemplate.height = percent(80);
        return columnTemplate;
    };
    Object.defineProperty(ColumnSeries.prototype, "clustered", {
        /**
         * @return {boolean} Clustered?
         */
        get: function () {
            return this.getPropertyValue("clustered");
        },
        /**
         * Cluster this series columns?
         *
         * Setting to `false` will make columns overlap with pther series.
         *
         * @default true
         * @param {boolean}  value  Clustered?
         */
        set: function (value) {
            this.setPropertyValue("clustered", value, true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColumnSeries.prototype, "dropFromOpenState", {
        /**
         * A state to apply to a column when close value is lower than open value.
         *
         * Can be used to differentiate appearance based on value relations.
         *
         * NOTE: this will work only if at least one axis is [[ValueAxis]].
         *
         * @readonly You can modify state object, but can't overwrite it
         * @return {SpriteState} State
         */
        get: function () {
            if (!this._dropFromOpenState) {
                this._dropFromOpenState = this.states.create("dropFromOpenState");
            }
            return this._dropFromOpenState;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColumnSeries.prototype, "dropFromPreviousState", {
        /**
         * A state to apply to a column when its value is lower value of a previous
         * column.
         *
         * Can be used to differentiate appearance based on value relations.
         *
         * @readonly You can modify state object, but can't overwrite it
         * @return {SpriteState} State
         */
        get: function () {
            if (!this._dropFromPreviousState) {
                this._dropFromPreviousState = this.states.create("dropFromPreviousState");
            }
            return this._dropFromPreviousState;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColumnSeries.prototype, "riseFromOpenState", {
        /**
         * A state to apply to a column when close value is same or higher than open
         * value.
         *
         * Can be used to differentiate appearance based on value relations.
         *
         * NOTE: this will work only if at least one axis is [[ValueAxis]].
         *
         * @readonly You can modify state object, but can't overwrite it
         * @return {SpriteState} State
         */
        get: function () {
            if (!this._riseFromOpenState) {
                this._riseFromOpenState = this.states.create("riseFromOpenState");
            }
            return this._riseFromOpenState;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColumnSeries.prototype, "riseFromPreviousState", {
        /**
         * A state to apply to a column when its value is same or higher than value
         * of a previous column.
         *
         * Can be used to differentiate appearance based on value relations.
         *
         * @readonly You can modify state object, but can't overwrite it
         * @return {SpriteState} State
         */
        get: function () {
            if (!this._riseFromPreviousState) {
                this._riseFromPreviousState = this.states.create("riseFromPreviousState");
            }
            return this._riseFromPreviousState;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Updates value of the related legend item.
     *
     * @ignore Exclude from docs
     * @param {ColumnSeriesDataItem}  dataItem  Data item
     */
    ColumnSeries.prototype.updateLegendValue = function (dataItem) {
        var _this = this;
        _super.prototype.updateLegendValue.call(this, dataItem);
        if (this.legendDataItem) {
            var marker = this.legendDataItem.marker;
            var fromOpenState_1;
            var fromPreviousState_1;
            if (dataItem) {
                if (dataItem.droppedFromOpen) {
                    fromOpenState_1 = this._dropFromOpenState;
                }
                else {
                    fromOpenState_1 = this._riseFromOpenState;
                }
                if (dataItem.droppedFromPrevious) {
                    fromPreviousState_1 = this._dropFromPreviousState;
                }
                else {
                    fromPreviousState_1 = this._riseFromPreviousState;
                }
            }
            $iter.each(marker.children.iterator(), function (child) {
                if (dataItem) {
                    child.setState(fromPreviousState_1, 0); // can not animate to two states at once, so animating to one only
                    child.setState(fromOpenState_1);
                }
                else {
                    // todo: think what to do here, maybe apply above states based on totals?
                    child.setState(_this._riseFromPreviousState, 0);
                    child.setState(_this._riseFromOpenState);
                }
            });
        }
    };
    /**
     * Creates elements in related legend container, that mimics the look of this
     * Series.
     *
     * @ignore Exclude from docs
     * @param {Container}  marker  Legend item container
     */
    ColumnSeries.prototype.createLegendMarker = function (marker) {
        var w = marker.pixelWidth;
        var h = marker.pixelHeight;
        marker.removeChildren();
        var column = marker.createChild(RoundedRectangle);
        $object.copyProperties(this, column, visualProperties);
        column.copyFrom(this.columns.template);
        column.padding(0, 0, 0, 0); // if columns will have padding (which is often), legend marker will be very narrow
        column.width = w;
        column.height = h;
    };
    /**
     * Copies all properties from another instance of [[ColumnSeries]].
     *
     * @param {ColumnSeries}  source  Source series
     */
    ColumnSeries.prototype.copyFrom = function (source) {
        _super.prototype.copyFrom.call(this, source);
        this.columns.template.copyFrom(source.columns.template);
    };
    /**
    * returns bullet x location
    * @ignore
    */
    ColumnSeries.prototype.getBulletLocationX = function (bullet, field) {
        if (this.baseAxis == this.xAxis) {
            return (this._startLocation + this._endLocation) / 2;
        }
        else {
            return _super.prototype.getBulletLocationX.call(this, bullet, field);
        }
    };
    /**
    * returns bullet y location
    * @ignore
    */
    ColumnSeries.prototype.getBulletLocationY = function (bullet, field) {
        if (this.baseAxis == this.yAxis) {
            return (this._startLocation + this._endLocation) / 2;
        }
        else {
            return _super.prototype.getBulletLocationY.call(this, bullet, field);
        }
    };
    return ColumnSeries;
}(XYSeries));
export { ColumnSeries };
/**
 * Register class in system, so that it can be instantiated using its name from
 * anywhere.
 *
 * @ignore
 */
system.registeredClasses["ColumnSeries"] = ColumnSeries;
system.registeredClasses["ColumnSeriesDataItem"] = ColumnSeriesDataItem;
//# sourceMappingURL=ColumnSeries.js.map