import $ from 'jquery';
import * as d3 from 'd3';

$(function() {
  renderGraph(data.graph); // eslint-disable-line

  $('#container-toggle').on('click', () => {
    console.log('toggled');
    $('#inner-container').toggleClass('open');
  });

  $('#add-user').on('click', () => {
    console.log('add user');
  });
});

const renderGraph = (data) => {
  let width = $('#graph').width(), height = $('#graph').height();

  const svg = d3.select('#graph').append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('pointer-events', 'all')
    .style('cursor', 'move')
    .style('font', '1.5rem "Rubik", Arial, sans-serif')
    .attr('text-anchor', 'middle');

  const container = svg.append('g'),
        // defs = svg.append('defs'),
        linksGr = container.append('g'),
        nodesGr = container.append('g'),
        // nodesTxGr = container.append('g'),
        x = d3.scaleLinear([0,1], [0,100]),
        y = d3.scaleLinear([0,1], [0,100]);

  let label = {
    'nodes': [],
    'links': []
  };


      data.nodes.forEach((d,i) => {
        label.nodes.push({node: d});
        label.nodes.push({node: d});
        label.links.push({
          source: i * 2,
          target: i * 2 + 1
        });
      });

      console.log(data.nodes);
      console.log(data.links);

      const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).distance(250).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('center', d3.forceCenter(width / 2, height /2));

      const link = linksGr
          .attr('stroke', '#6E7191')
        .selectAll('line')
        .data(data.links)
        .join('line')
          .attr('stroke-width', '3')
          .attr('stroke', '#6E7191')
          .attr('class', d => d.relType);

      const node = nodesGr
          .attr('stroke-width', 10)
        .selectAll('g')
        .data(data.nodes)
        .join('g')
          .attr('class', 'node')
          .call(drag(simulation))
          .attr('cx', d => x(d[1]))
          .attr('cy', d => y(d[2]))
          .call(drag(simulation));

      node.append('circle')
        .attr('id', (d, i) => {
          d.nodeUid = 'node-' + i;
          return d.nodeUid;
        })
        .attr('r', 40)
        .attr('stroke', d => {
          let color = d.profileColor;
          let strokeColor =
              (color === 'color-pink') ? '#fe66b8'
            : (color === 'color-magenta') ? '#f83a74'
            : (color === 'color-red') ? '#f42525'
            : (color === 'color-orange') ? '#ff5722'
            : (color === 'color-yellow') ? '#ffc52f'
            : (color === 'color-green') ? '#1db954'
            : (color === 'color-teal') ? '#07a092'
            : (color === 'color-light-blue') ? '#0ab4ff'
            : (color === 'color-dark-blue') ? '#4169e1'
            : (color === 'color-purple') ? '#922aff'
            : (color === 'color-brown') ? '#ae640d'
            : (color === 'color-gray') ? '#6e7191'
            : (color === 'color-black') ? '#1d1b2d'
            : color;
          return strokeColor;
        })
        .attr('fill', '#000')
        .attr('cx', d => x(d[1]))
        .attr('cy', d => y(d[2]));

      node.append('image')
        .attr('xlink:href', d => {
          let image = !d.avatar ? '../assets/icons/user.svg' : d.avatar;
          return image;
        })
        .attr('width', 80)
        .attr('height', 80)
        .attr('x', 0)
        .attr('y', 0);

      node.append('text')
        .text(d => `${d.firstName} ${d.lastName}`)
        .attr('class', 'node-text');

      node.append('title')
        .text(d => {
          return `${d.firstName} ${d.lastName}`;
        });

      node.on('click', (d, i) => {
        console.log(`redirect to /account/profile/${i.fid}-${i.uid}`);
      });

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .selectAll('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        node
          .selectAll('image')
            .attr('x', d => d.x - 40)
            .attr('y', d => d.y - 40);

        node
          .selectAll('clipPath')
            .attr('dx', d => d.x)
            .attr('dy', d => d.y);

        node
          .selectAll('text')
            .attr('dx', d => d.x)
            .attr('dy', d => d.y + 65);
    });

    let transform;

    const zoom = d3.zoom()
      .scaleExtent([.5, 2])
      .on('zoom', e => {
        container.attr('transform', (transform = e.transform)); // eslint-disable-line
      });

    return svg
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity)
      .node();


};

const drag = simulation => {
  function dragstarted(event) {
    if (!event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
};

if(typeof(module.hot) !== 'undefined') {
  module.hot.accept(); // eslint-disable-line no-undef
}